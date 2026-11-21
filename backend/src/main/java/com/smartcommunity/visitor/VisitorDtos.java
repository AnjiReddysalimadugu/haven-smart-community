package com.smartcommunity.visitor;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class VisitorDtos {
    private VisitorDtos() {
    }

    public record CreateVisitorRequest(
            UUID flatId,
            @NotBlank String visitorName,
            String mobile,
            @NotBlank String visitType,
            @Min(5) @Max(1440) Integer validityMinutes,
            Boolean requiresApproval
    ) {
    }

    public record CreatedVisitorResponse(
            UUID id,
            String visitorName,
            String visitType,
            String qrToken,
            Instant expiresAt,
            UUID flatId,
            VisitorApprovalStatus approvalStatus
    ) {
    }

    public record ValidateRequest(@NotBlank String qrToken) {
    }

    public record ExitRequest(@NotBlank String qrToken) {
    }

    public record RejectRequest(@Size(max = 500) String reason) {
    }

    public record ValidationResponse(
            boolean valid,
            String message,
            UUID id,
            String visitorName,
            String flatNumber
    ) {
    }

    public record VisitorResponse(
            UUID id,
            UUID flatId,
            String flatNumber,
            String visitorName,
            String mobile,
            String visitType,
            Instant expiresAt,
            boolean used,
            Instant entryAt,
            Instant exitAt,
            VisitorApprovalStatus approvalStatus,
            Instant approvedAt,
            String rejectionReason
    ) {
    }
}
