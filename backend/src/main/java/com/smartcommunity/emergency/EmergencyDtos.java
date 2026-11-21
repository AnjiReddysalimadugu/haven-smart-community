package com.smartcommunity.emergency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class EmergencyDtos {
    private EmergencyDtos() {
    }

    public record CreateRequest(
            UUID apartmentId,
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 80) String roleLabel,
            @NotBlank @Size(max = 30) String phone,
            Integer sortOrder
    ) {
    }

    public record UpdateRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 80) String roleLabel,
            @NotBlank @Size(max = 30) String phone,
            Integer sortOrder
    ) {
    }

    public record Response(
            UUID id,
            UUID apartmentId,
            String name,
            String roleLabel,
            String phone,
            int sortOrder,
            boolean active,
            Instant createdAt
    ) {
    }
}
