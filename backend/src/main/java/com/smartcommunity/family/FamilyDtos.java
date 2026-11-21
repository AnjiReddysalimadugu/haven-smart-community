package com.smartcommunity.family;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class FamilyDtos {
    private FamilyDtos() {
    }

    public record CreateRequest(
            UUID flatId,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Size(max = 40) String relation,
            @Size(max = 20) String mobile,
            Integer age
    ) {
    }

    public record UpdateRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Size(max = 40) String relation,
            @Size(max = 20) String mobile,
            Integer age
    ) {
    }

    public record Response(
            UUID id,
            UUID flatId,
            String flatNumber,
            String fullName,
            String relation,
            String mobile,
            Integer age,
            boolean active,
            Instant createdAt
    ) {
    }
}
