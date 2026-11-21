package com.smartcommunity.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.otp")
public class OtpProperties {
    /** OTP lifetime in minutes. */
    private int ttlMinutes = 10;
    /** Max active request attempts per email in the cooldown window. */
    private int maxRequestsPerWindow = 5;
    private int requestWindowMinutes = 15;
    private int maxVerifyAttempts = 5;
    /**
     * When true, request-OTP responses include {@code devOtp} for local/Postman testing.
     * Keep false when SMTP is enabled / in production.
     */
    private boolean exposeInResponse = false;

    public int getTtlMinutes() {
        return ttlMinutes;
    }

    public void setTtlMinutes(int ttlMinutes) {
        this.ttlMinutes = ttlMinutes;
    }

    public int getMaxRequestsPerWindow() {
        return maxRequestsPerWindow;
    }

    public void setMaxRequestsPerWindow(int maxRequestsPerWindow) {
        this.maxRequestsPerWindow = maxRequestsPerWindow;
    }

    public int getRequestWindowMinutes() {
        return requestWindowMinutes;
    }

    public void setRequestWindowMinutes(int requestWindowMinutes) {
        this.requestWindowMinutes = requestWindowMinutes;
    }

    public int getMaxVerifyAttempts() {
        return maxVerifyAttempts;
    }

    public void setMaxVerifyAttempts(int maxVerifyAttempts) {
        this.maxVerifyAttempts = maxVerifyAttempts;
    }

    public boolean isExposeInResponse() {
        return exposeInResponse;
    }

    public void setExposeInResponse(boolean exposeInResponse) {
        this.exposeInResponse = exposeInResponse;
    }
}
