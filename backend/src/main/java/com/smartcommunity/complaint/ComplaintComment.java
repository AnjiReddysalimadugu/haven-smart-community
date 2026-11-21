package com.smartcommunity.complaint;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "complaint_comments")
public class ComplaintComment {
    @Id
    private UUID id;

    @Column(name = "complaint_id", nullable = false)
    private UUID complaintId;

    @Column(name = "author_user_id", nullable = false)
    private UUID authorUserId;

    @Column(name = "author_name", nullable = false, length = 140)
    private String authorName;

    @Column(nullable = false, length = 2000)
    private String body;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ComplaintComment() {
    }

    public ComplaintComment(UUID complaintId, UUID authorUserId, String authorName, String body) {
        this.id = UUID.randomUUID();
        this.complaintId = complaintId;
        this.authorUserId = authorUserId;
        this.authorName = authorName;
        this.body = body;
    }

    public UUID getId() { return id; }
    public UUID getComplaintId() { return complaintId; }
    public UUID getAuthorUserId() { return authorUserId; }
    public String getAuthorName() { return authorName; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
}
