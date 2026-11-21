package com.smartcommunity.property;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "flat_occupancies")
public class FlatOccupancy {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "flat_id", nullable = false)
    private UUID flatId;

    @Column(name = "resident_user_id", nullable = false)
    private UUID residentUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "occupancy_type", nullable = false, length = 20)
    private OccupancyType occupancyType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OccupancyStatus status = OccupancyStatus.ACTIVE;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "allocated_by")
    private UUID allocatedBy;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected FlatOccupancy() {}

    public FlatOccupancy(UUID flatId, UUID residentUserId, OccupancyType occupancyType, UUID allocatedBy, String notes) {
        this.flatId = flatId;
        this.residentUserId = residentUserId;
        this.occupancyType = occupancyType;
        this.allocatedBy = allocatedBy;
        this.notes = notes;
    }

    public UUID getId() { return id; }
    public UUID getFlatId() { return flatId; }
    public UUID getResidentUserId() { return residentUserId; }
    public OccupancyType getOccupancyType() { return occupancyType; }
    public OccupancyStatus getStatus() { return status; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public UUID getAllocatedBy() { return allocatedBy; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }

    public void end(Instant at) {
        this.status = OccupancyStatus.ENDED;
        this.endedAt = at;
    }
}
