package com.smartcommunity.notify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PushNotificationService {
    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final PushTokenRepository tokens;
    private final RestClient http = RestClient.create();

    public PushNotificationService(PushTokenRepository tokens) {
        this.tokens = tokens;
    }

    public void register(UUID userId, String token, String platform) {
        if (token == null || token.isBlank()) return;
        String normalized = token.trim();
        String plat = platform == null || platform.isBlank() ? "unknown" : platform.trim();
        tokens.findByToken(normalized).ifPresentOrElse(existing -> {
            existing.reassign(userId, plat);
            tokens.save(existing);
        }, () -> tokens.save(new PushToken(userId, normalized, plat)));
    }

    public void unregister(String token) {
        if (token == null || token.isBlank()) return;
        tokens.deleteByToken(token.trim());
    }

    public void sendToUser(UUID userId, String title, String body, Map<String, Object> data) {
        List<PushToken> list = tokens.findByUserId(userId);
        if (list.isEmpty()) return;
        for (PushToken t : list) {
            if ("WEB".equalsIgnoreCase(t.getPlatform())) {
                log.info("WEB push queued for user {} (subscription stored; configure VAPID sender to deliver)", userId);
                continue;
            }
            sendExpo(t.getToken(), title, body, data);
        }
    }

    private void sendExpo(String to, String title, String body, Map<String, Object> data) {
        try {
            http.post()
                    .uri(EXPO_PUSH_URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "to", to,
                            "title", title,
                            "body", body,
                            "sound", "default",
                            "data", data == null ? Map.of() : data
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Expo push failed for {}: {}", to, ex.getMessage());
        }
    }
}
