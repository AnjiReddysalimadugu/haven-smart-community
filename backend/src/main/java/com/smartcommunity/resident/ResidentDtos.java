package com.smartcommunity.resident;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class ResidentDtos {
    private ResidentDtos() {}

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 180) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 140) String fullName,
            UUID apartmentId
    ) {}

    public record UpdateRequest(
            @NotBlank @Size(max = 140) String fullName,
            @NotBlank @Email @Size(max = 180) String email,
            @Size(min = 8, max = 72) String password
    ) {}

    public record ResidentResponse(
            UUID id,
            String email,
            String fullName,
            UUID apartmentId,
            String apartmentName,
            UUID flatId,
            String flatNumber,
            boolean active,
            Instant createdAt
    ) {}
}
