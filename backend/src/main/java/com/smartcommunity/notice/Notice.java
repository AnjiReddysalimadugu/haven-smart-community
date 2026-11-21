package com.smartcommunity.notice;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notices")
public class Notice {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "apartment_id", nullable = false)
    private UUID apartmentId;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 4000)
    private String body;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt = Instant.now();

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected Notice() {
    }

    public Notice(UUID apartmentId, String title, String body, Instant expiresAt, UUID createdBy) {
        this.apartmentId = apartmentId;
        this.title = title;
        this.body = body;
        this.expiresAt = expiresAt;
        this.createdBy = createdBy;
    }

    public UUID getId() { return id; }
    public UUID getApartmentId() { return apartmentId; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public Instant getPublishedAt() { return publishedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public UUID getCreatedBy() { return createdBy; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }

    public void update(String title, String body, Instant expiresAt) {
        this.title = title;
        this.body = body;
        this.expiresAt = expiresAt;
    }

    public void deactivate() {
        this.active = false;
    }

    public boolean isCurrentlyVisible() {
        if (!active) return false;
        return expiresAt == null || expiresAt.isAfter(Instant.now());
    }
}
