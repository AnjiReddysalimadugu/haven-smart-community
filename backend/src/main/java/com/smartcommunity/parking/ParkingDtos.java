package com.smartcommunity.parking;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class ParkingDtos {
    private ParkingDtos() {
    }

    public record CreateRequest(
            @NotNull UUID apartmentId,
            @NotBlank String slotCode,
            @NotBlank String vehicleType,
            @NotNull @DecimalMin("0.0") BigDecimal monthlyCharge
    ) {
    }

    public record UpdateRequest(
            @NotBlank String slotCode,
            @NotBlank String vehicleType,
            @NotNull @DecimalMin("0.0") BigDecimal monthlyCharge
    ) {
    }

    public record AllocateRequest(
            @NotNull UUID flatId,
            String vehicleNumber
    ) {
    }

    public record Response(
            UUID id,
            UUID apartmentId,
            String slotCode,
            String vehicleType,
            BigDecimal monthlyCharge,
            boolean active,
            UUID flatId,
            String flatNumber,
            String vehicleNumber,
            Instant allocatedAt,
            boolean allocated
    ) {
    }
}
