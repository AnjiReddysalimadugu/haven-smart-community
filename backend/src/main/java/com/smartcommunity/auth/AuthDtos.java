package com.smartcommunity.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record RequestOtpRequest(
            @NotBlank @Email String email
    ) {
    }

    public record RequestOtpResponse(
            String message,
            Instant expiresAt,
            /** Present only when app.otp.expose-in-response=true (local/dev). */
            String devOtp
    ) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank
            @Size(min = 6, max = 6)
            @Pattern(regexp = "\\d{6}", message = "OTP must be a 6-digit code")
            String otp
    ) {
    }

    public record GoogleLoginRequest(
            @NotBlank
            @Size(min = 80, max = 4096, message = "Invalid Google ID token")
            String idToken
    ) {
    }

    public record AuthOptionsResponse(
            boolean googleEnabled,
            boolean otpEnabled
    ) {
    }

    public record AuthUserResponse(
            UUID id,
            String email,
            String fullName,
            Role role,
            UUID apartmentId,
            String apartmentName,
            UUID flatId,
            String flatNumber
    ) {
    }

    public record LoginResponse(
            String accessToken,
            String tokenType,
            long expiresInSeconds,
            AuthUserResponse user
    ) {
    }

    public record UpdateProfileRequest(
            @NotBlank @Size(min = 2, max = 140) String fullName,
            @Size(min = 8, max = 72) String password
    ) {
    }
}
