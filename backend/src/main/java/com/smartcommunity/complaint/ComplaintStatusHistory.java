package com.smartcommunity.complaint;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "complaint_status_history")
public class ComplaintStatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "complaint_id", nullable = false)
    private UUID complaintId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 24)
    private ComplaintStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 24)
    private ComplaintStatus toStatus;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(name = "actor_name", length = 120)
    private String actorName;

    @Column(length = 2000)
    private String note;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected ComplaintStatusHistory() {
    }

    public ComplaintStatusHistory(UUID complaintId, ComplaintStatus from, ComplaintStatus to,
                                  UUID actorUserId, String actorName, String note) {
        this.complaintId = complaintId;
        this.fromStatus = from;
        this.toStatus = to;
        this.actorUserId = actorUserId;
        this.actorName = actorName;
        this.note = note;
    }

    public UUID getId() { return id; }
    public UUID getComplaintId() { return complaintId; }
    public ComplaintStatus getFromStatus() { return fromStatus; }
    public ComplaintStatus getToStatus() { return toStatus; }
    public UUID getActorUserId() { return actorUserId; }
    public String getActorName() { return actorName; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
