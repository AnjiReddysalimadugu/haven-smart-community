package com.smartcommunity.user;

import com.smartcommunity.auth.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class UserDtos {
    private UserDtos() {
    }

    public record CreateUserRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(min = 2, max = 140) String fullName,
            @NotNull Role role,
            UUID apartmentId
    ) {
    }

    public record UpdateUserRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 2, max = 140) String fullName,
            @Size(min = 8, max = 72) String password
    ) {
    }

    public record UserResponse(
            UUID id,
            String email,
            String fullName,
            Role role,
            UUID apartmentId,
            String apartmentName,
            UUID flatId,
            String flatNumber,
            boolean active,
            Instant createdAt
    ) {
    }
}
