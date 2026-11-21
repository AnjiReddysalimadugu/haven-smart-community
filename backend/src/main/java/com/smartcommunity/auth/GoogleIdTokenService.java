package com.smartcommunity.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.smartcommunity.common.BusinessException;
import com.smartcommunity.common.UnauthorizedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import java.util.Locale;

@Service
public class GoogleIdTokenService {
    private static final Logger log = LoggerFactory.getLogger(GoogleIdTokenService.class);

    private final GoogleAuthProperties properties;

    public GoogleIdTokenService(GoogleAuthProperties properties) {
        this.properties = properties;
    }

    public record VerifiedGoogleUser(String email, String fullName, String subject, boolean emailVerified) {
    }

    public VerifiedGoogleUser verify(String rawIdToken) {
        if (!properties.isConfigured()) {
            throw new BusinessException("Google sign-in is not enabled on this server");
        }

        String idToken = rawIdToken == null ? "" : rawIdToken.trim();
        if (idToken.isBlank()) {
            throw new UnauthorizedException("Google ID token is required");
        }
        // JWT shape: header.payload.signature
        if (idToken.chars().filter(c -> c == '.').count() != 2 || idToken.length() < 80 || idToken.length() > 4096) {
            throw new UnauthorizedException("Invalid Google ID token");
        }

        List<String> audiences = properties.clientIdList();
        if (audiences.isEmpty()) {
            throw new BusinessException("Google sign-in is misconfigured (missing client IDs)");
        }

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        )
                .setAudience(audiences)
                .build();

        GoogleIdToken token;
        try {
            token = verifier.verify(idToken);
        } catch (GeneralSecurityException | IOException e) {
            log.warn("Google ID token verification failed: {}", e.toString());
            throw new UnauthorizedException("Could not verify Google sign-in");
        }

        if (token == null) {
            throw new UnauthorizedException("Invalid or expired Google sign-in");
        }

        GoogleIdToken.Payload payload = token.getPayload();
        String email = payload.getEmail();
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Google account did not return an email");
        }
        email = email.trim().toLowerCase(Locale.ROOT);

        Boolean verified = payload.getEmailVerified();
        if (verified == null || !verified) {
            throw new UnauthorizedException("Google email is not verified. Use a verified Google account");
        }

        String name = payload.get("name") instanceof String s && !s.isBlank()
                ? s.trim()
                : email;
        String subject = payload.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new UnauthorizedException("Invalid Google sign-in payload");
        }

        return new VerifiedGoogleUser(email, name, subject, true);
    }
}
