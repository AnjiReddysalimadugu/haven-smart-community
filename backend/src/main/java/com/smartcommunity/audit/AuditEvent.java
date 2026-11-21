package com.smartcommunity.audit;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id
    private UUID id;

    @Column(nullable = false, length = 64)
    private String action;

    @Column(nullable = false, length = 64)
    private String entityType;

    private UUID entityId;

    @Column(nullable = false, length = 512)
    private String summary;

    private UUID actorId;

    @Column(length = 160)
    private String actorName;

    private UUID apartmentId;

    @Column(nullable = false)
    private Instant createdAt;

    protected AuditEvent() {}

    public AuditEvent(String action, String entityType, UUID entityId, String summary,
                      UUID actorId, String actorName, UUID apartmentId) {
        this.id = UUID.randomUUID();
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.summary = summary;
        this.actorId = actorId;
        this.actorName = actorName;
        this.apartmentId = apartmentId;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public UUID getEntityId() { return entityId; }
    public String getSummary() { return summary; }
    public UUID getActorId() { return actorId; }
    public String getActorName() { return actorName; }
    public UUID getApartmentId() { return apartmentId; }
    public Instant getCreatedAt() { return createdAt; }
}
