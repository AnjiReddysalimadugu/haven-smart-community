package com.smartcommunity.notice;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class NoticeDtos {
    private NoticeDtos() {
    }

    public record CreateRequest(
            UUID apartmentId,
            @NotBlank @Size(max = 160) String title,
            @NotBlank @Size(max = 4000) String body,
            Instant expiresAt
    ) {
    }

    public record UpdateRequest(
            @NotBlank @Size(max = 160) String title,
            @NotBlank @Size(max = 4000) String body,
            Instant expiresAt
    ) {
    }

    public record Response(
            UUID id,
            UUID apartmentId,
            String title,
            String body,
            Instant publishedAt,
            Instant expiresAt,
            boolean active,
            Instant createdAt
    ) {
    }
}
