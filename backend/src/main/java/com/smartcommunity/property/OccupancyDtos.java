package com.smartcommunity.property;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class OccupancyDtos {
    private OccupancyDtos() {}

    public record AllocateRequest(
            @NotNull UUID residentUserId,
            @NotNull OccupancyType occupancyType,
            @Size(max = 500) String notes
    ) {}

    public record OccupancyResponse(
            UUID id,
            UUID flatId,
            String flatNumber,
            UUID residentUserId,
            String residentName,
            String residentEmail,
            OccupancyType occupancyType,
            OccupancyStatus status,
            Instant startedAt,
            Instant endedAt,
            String notes
    ) {}
}
