package com.smartcommunity.complaint;

import com.smartcommunity.property.Flat;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "complaints")
public class Complaint {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "flat_id")
    private Flat flat;

    @Column(nullable = false, length = 140)
    private String title;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private ComplaintStatus status = ComplaintStatus.RAISED;

    @Column(name = "assignee_user_id")
    private UUID assigneeUserId;

    @Column(name = "resolution_notes", length = 2000)
    private String resolutionNotes;

    @Column(name = "evidence_url", length = 1000)
    private String evidenceUrl;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column
    private Instant updatedAt = Instant.now();

    protected Complaint() {
    }

    public Complaint(Flat flat, String title, String category, String description) {
        this.flat = flat;
        this.title = title;
        this.category = category;
        this.description = description;
    }

    public UUID getId() { return id; }
    public Flat getFlat() { return flat; }
    public String getTitle() { return title; }
    public String getCategory() { return category; }
    public String getDescription() { return description; }
    public ComplaintStatus getStatus() { return status; }
    public UUID getAssigneeUserId() { return assigneeUserId; }
    public String getResolutionNotes() { return resolutionNotes; }
    public String getEvidenceUrl() { return evidenceUrl; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setStatus(ComplaintStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public void setAssigneeUserId(UUID assigneeUserId) {
        this.assigneeUserId = assigneeUserId;
        this.updatedAt = Instant.now();
    }

    public void setResolutionNotes(String resolutionNotes) {
        this.resolutionNotes = resolutionNotes;
        this.updatedAt = Instant.now();
    }

    public void setEvidenceUrl(String evidenceUrl) {
        this.evidenceUrl = evidenceUrl;
        this.updatedAt = Instant.now();
    }
}
