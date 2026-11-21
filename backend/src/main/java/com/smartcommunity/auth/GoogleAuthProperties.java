package com.smartcommunity.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Arrays;
import java.util.List;

@ConfigurationProperties(prefix = "app.google")
public class GoogleAuthProperties {
    /** Master switch — when false, /auth/google returns a clear business error. */
    private boolean enabled = false;
    /**
     * Comma-separated OAuth client IDs (Web, Android, iOS, Expo).
     * Env: GOOGLE_CLIENT_IDS=xxx.apps.googleusercontent.com,yyy.apps.googleusercontent.com
     */
    private String clientIds = "";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getClientIds() {
        return clientIds;
    }

    public void setClientIds(String clientIds) {
        this.clientIds = clientIds == null ? "" : clientIds;
    }

    public List<String> clientIdList() {
        if (clientIds == null || clientIds.isBlank()) {
            return List.of();
        }
        return Arrays.stream(clientIds.split("[,;\\s]+"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();
    }

    public boolean isConfigured() {
        return enabled && !clientIdList().isEmpty();
    }
}
