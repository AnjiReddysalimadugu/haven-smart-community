package com.smartcommunity.visitor;

import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.property.Flat;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "visitor_passes")
public class VisitorPass {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "flat_id")
    private Flat flat;

    @Column(nullable = false, length = 120)
    private String visitorName;

    @Column(length = 20)
    private String mobile;

    @Column(nullable = false, length = 30)
    private String visitType;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean used = false;

    @Column
    private Instant entryAt;

    @Column
    private Instant exitAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    private VisitorApprovalStatus approvalStatus = VisitorApprovalStatus.APPROVED;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected VisitorPass() {
    }

    public VisitorPass(Flat flat, String name, String mobile, String type, String hash, Instant expiry,
                       VisitorApprovalStatus status, UUID createdBy) {
        this.flat = flat;
        this.visitorName = name;
        this.mobile = mobile;
        this.visitType = type;
        this.tokenHash = hash;
        this.expiresAt = expiry;
        this.approvalStatus = status;
        this.createdBy = createdBy;
        if (status == VisitorApprovalStatus.APPROVED) {
            this.approvedAt = Instant.now();
            this.approvedBy = createdBy;
        }
    }

    public UUID getId() { return id; }
    public Flat getFlat() { return flat; }
    public String getVisitorName() { return visitorName; }
    public String getMobile() { return mobile; }
    public String getVisitType() { return visitType; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isUsed() { return used; }
    public Instant getEntryAt() { return entryAt; }
    public Instant getExitAt() { return exitAt; }
    public VisitorApprovalStatus getApprovalStatus() { return approvalStatus; }
    public Instant getApprovedAt() { return approvedAt; }
    public UUID getApprovedBy() { return approvedBy; }
    public UUID getCreatedBy() { return createdBy; }
    public String getRejectionReason() { return rejectionReason; }
    public Instant getCreatedAt() { return createdAt; }

    public void approve(UUID actorId) {
        if (approvalStatus != VisitorApprovalStatus.PENDING) {
            throw new InvalidRequestException("Only pending visitor requests can be approved");
        }
        if (used) {
            throw new InvalidRequestException("Pass already used");
        }
        this.approvalStatus = VisitorApprovalStatus.APPROVED;
        this.approvedAt = Instant.now();
        this.approvedBy = actorId;
        this.rejectionReason = null;
    }

    public void reject(UUID actorId, String reason) {
        if (approvalStatus != VisitorApprovalStatus.PENDING) {
            throw new InvalidRequestException("Only pending visitor requests can be rejected");
        }
        this.approvalStatus = VisitorApprovalStatus.REJECTED;
        this.approvedAt = Instant.now();
        this.approvedBy = actorId;
        this.rejectionReason = reason == null || reason.isBlank() ? null : reason.trim();
    }

    public void enter() {
        if (approvalStatus != VisitorApprovalStatus.APPROVED) {
            throw new InvalidRequestException("Visitor pass is not approved");
        }
        used = true;
        entryAt = Instant.now();
    }

    public void exit() {
        if (!used || entryAt == null) {
            throw new InvalidRequestException("Visitor has not checked in");
        }
        if (exitAt != null) {
            throw new InvalidRequestException("Visitor already checked out");
        }
        exitAt = Instant.now();
    }
}
