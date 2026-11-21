package com.smartcommunity.property;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "apartments")
public class Apartment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(nullable = false, length = 240)
    private String address;

    @Column(name = "timezone", nullable = false, length = 60)
    private String timezone = "Asia/Kolkata";

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Apartment() {
    }

    public Apartment(String name, String address, String timezone) {
        this.name = name;
        this.address = address;
        this.timezone = timezone == null ? "Asia/Kolkata" : timezone;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getAddress() { return address; }
    public String getTimezone() { return timezone; }
    public String getStatus() { return status; }

    public void update(String name, String address, String timezone) {
        if (name != null && !name.isBlank()) this.name = name.trim();
        if (address != null && !address.isBlank()) this.address = address.trim();
        if (timezone != null && !timezone.isBlank()) this.timezone = timezone.trim();
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
