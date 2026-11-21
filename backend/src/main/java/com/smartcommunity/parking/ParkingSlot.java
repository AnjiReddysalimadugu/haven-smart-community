package com.smartcommunity.parking;

import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.property.Apartment;
import com.smartcommunity.property.Flat;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "parking_slots", uniqueConstraints = @UniqueConstraint(columnNames = {"apartment_id", "slot_code"}))
public class ParkingSlot {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "apartment_id")
    private Apartment apartment;

    @Column(name = "slot_code", nullable = false, length = 30)
    private String slotCode;

    @Column(nullable = false, length = 20)
    private String vehicleType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyCharge;

    @Column(nullable = false)
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flat_id")
    private Flat flat;

    @Column(name = "vehicle_number", length = 40)
    private String vehicleNumber;

    @Column(name = "allocated_at")
    private Instant allocatedAt;

    protected ParkingSlot() {
    }

    public ParkingSlot(Apartment apartment, String code, String type, BigDecimal charge) {
        this.apartment = apartment;
        this.slotCode = code;
        this.vehicleType = type;
        this.monthlyCharge = charge;
    }

    public UUID getId() {
        return id;
    }

    public UUID getApartmentId() {
        return apartment.getId();
    }

    public Apartment getApartment() {
        return apartment;
    }

    public String getSlotCode() {
        return slotCode;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public BigDecimal getMonthlyCharge() {
        return monthlyCharge;
    }

    public boolean isActive() {
        return active;
    }

    public Flat getFlat() {
        return flat;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public Instant getAllocatedAt() {
        return allocatedAt;
    }

    public boolean isAllocated() {
        return flat != null;
    }

    public void allocate(Flat flat, String vehicleNumber) {
        if (!active) {
            throw new InvalidRequestException("Parking slot is inactive");
        }
        if (this.flat != null) {
            throw new InvalidRequestException("Parking slot is already allocated");
        }
        this.flat = flat;
        this.vehicleNumber = vehicleNumber == null || vehicleNumber.isBlank() ? null : vehicleNumber.trim().toUpperCase();
        this.allocatedAt = Instant.now();
    }

    public void release() {
        if (this.flat == null) {
            throw new InvalidRequestException("Parking slot is not allocated");
        }
        this.flat = null;
        this.vehicleNumber = null;
        this.allocatedAt = null;
    }

    public void update(String slotCode, String vehicleType, BigDecimal monthlyCharge) {
        if (slotCode != null && !slotCode.isBlank()) this.slotCode = slotCode.trim();
        if (vehicleType != null && !vehicleType.isBlank()) this.vehicleType = vehicleType.trim().toUpperCase();
        if (monthlyCharge != null) this.monthlyCharge = monthlyCharge;
    }

    public void deactivate() {
        if (flat != null) {
            throw new InvalidRequestException("Release the allocation before deactivating the slot");
        }
        this.active = false;
    }
}
