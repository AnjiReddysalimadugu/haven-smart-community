package com.smartcommunity.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcommunity.common.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple per-IP throttle for auth + gate validate (brute-force / flood fence).
 * Not a full DDoS shield — put Cloudflare/nginx in front for production traffic.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final int WINDOW_SECONDS = 60;
    private static final int AUTH_LIMIT = 30;
    private static final int VALIDATE_LIMIT = 60;

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public AuthRateLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) return true;
        return !(path.startsWith("/api/v1/auth/")
                || path.equals("/api/v1/visitors/validate")
                || path.equals("/api/v1/visitors/exit"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        int limit = path != null && path.startsWith("/api/v1/auth/") ? AUTH_LIMIT : VALIDATE_LIMIT;
        String ip = clientIp(request);
        String key = ip + "|" + (path != null && path.startsWith("/api/v1/auth/") ? "auth" : "gate");
        long now = Instant.now().getEpochSecond();
        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.startSec >= WINDOW_SECONDS) {
                return new Window(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });
        if (window.count.get() > limit) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(),
                    new ApiError(Instant.now(), 429, "Too Many Requests",
                            "Too many attempts. Wait a minute and try again", path, Map.of()));
            return;
        }
        // Light GC of stale keys
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> now - e.getValue().startSec >= WINDOW_SECONDS * 2L);
        }
        filterChain.doFilter(request, response);
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }

    private record Window(long startSec, AtomicInteger count) {}
}
