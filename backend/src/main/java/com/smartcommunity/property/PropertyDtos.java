package com.smartcommunity.property;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.UUID;

public final class PropertyDtos {
    private PropertyDtos() {
    }

    public record ApartmentRequest(
            @NotBlank @Size(max = 140) String name,
            @NotBlank @Size(max = 240) String address,
            String timezone
    ) {
    }

    public record ApartmentUpdateRequest(
            @NotBlank @Size(max = 140) String name,
            @NotBlank @Size(max = 240) String address,
            String timezone
    ) {
    }

    public record ApartmentResponse(UUID id, String name, String address, String timezone, String status) {
    }

    public record BlockRequest(@NotNull UUID apartmentId, @NotBlank String name, @NotBlank @Size(max = 20) String code) {
    }

    public record BlockUpdateRequest(@NotBlank String name, @NotBlank @Size(max = 20) String code) {
    }

    public record BlockResponse(UUID id, UUID apartmentId, String name, String code) {
    }

    public record FloorRequest(@NotNull UUID blockId, @NotNull Integer floorNumber, @NotBlank String name) {
    }

    public record FloorUpdateRequest(@NotNull Integer floorNumber, @NotBlank String name) {
    }

    public record FloorResponse(UUID id, UUID blockId, Integer floorNumber, String name) {
    }

    public record FlatRequest(
            @NotNull UUID floorId,
            @NotBlank String flatNumber,
            @DecimalMin("0.0") BigDecimal areaSqft,
            @Min(0) @Max(20) Integer bedroomCount
    ) {
    }

    public record FlatUpdateRequest(
            @NotBlank String flatNumber,
            @DecimalMin("0.0") BigDecimal areaSqft,
            @Min(0) @Max(20) Integer bedroomCount
    ) {
    }

    public record FlatStatusRequest(@NotNull FlatStatus status) {
    }

    public record FlatResponse(
            UUID id, UUID floorId, String flatNumber, BigDecimal areaSqft, Integer bedroomCount, FlatStatus status
    ) {
    }
}
