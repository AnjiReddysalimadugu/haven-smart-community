package com.smartcommunity.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

@ConfigurationProperties(prefix = "app.security.jwt")
public class JwtProperties {
    private String secret;
    private long expirationMinutes = 480;

    public String getSecret() {
        if (!StringUtils.hasText(secret) || secret.length() < 32) {
            throw new IllegalStateException(
                    "app.security.jwt.secret / JWT_SECRET must be set to a value of at least 32 characters");
        }
        return secret;
    }

    public void setSecret(String secret) { this.secret = secret; }

    public long getExpirationMinutes() { return expirationMinutes; }

    public void setExpirationMinutes(long expirationMinutes) { this.expirationMinutes = expirationMinutes; }
}
