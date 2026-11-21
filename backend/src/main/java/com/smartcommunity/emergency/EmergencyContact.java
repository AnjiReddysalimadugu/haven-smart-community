package com.smartcommunity.emergency;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "emergency_contacts")
public class EmergencyContact {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "apartment_id", nullable = false)
    private UUID apartmentId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "role_label", nullable = false, length = 80)
    private String roleLabel;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected EmergencyContact() {
    }

    public EmergencyContact(UUID apartmentId, String name, String roleLabel, String phone, int sortOrder) {
        this.apartmentId = apartmentId;
        this.name = name;
        this.roleLabel = roleLabel;
        this.phone = phone;
        this.sortOrder = sortOrder;
    }

    public UUID getId() { return id; }
    public UUID getApartmentId() { return apartmentId; }
    public String getName() { return name; }
    public String getRoleLabel() { return roleLabel; }
    public String getPhone() { return phone; }
    public int getSortOrder() { return sortOrder; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }

    public void update(String name, String roleLabel, String phone, int sortOrder) {
        this.name = name;
        this.roleLabel = roleLabel;
        this.phone = phone;
        this.sortOrder = sortOrder;
    }

    public void deactivate() {
        this.active = false;
    }
}
