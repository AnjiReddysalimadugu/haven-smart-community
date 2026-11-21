package com.smartcommunity.complaint;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ComplaintDtos {
    private ComplaintDtos() {
    }

    public record CreateRequest(
            UUID flatId,
            @NotBlank @Size(max = 140) String title,
            @NotBlank @Size(max = 30) String category,
            @NotBlank @Size(max = 2000) String description
    ) {
    }

    public record StatusRequest(
            @NotNull ComplaintStatus status,
            UUID assigneeUserId,
            @Size(max = 2000) String resolutionNotes,
            @Size(max = 1000) String evidenceUrl
    ) {
    }

    public record CommentRequest(@NotBlank @Size(max = 2000) String body) {
    }

    public record CommentResponse(
            UUID id,
            UUID authorUserId,
            String authorName,
            String body,
            Instant createdAt
    ) {
    }

    public record HistoryResponse(
            UUID id,
            ComplaintStatus fromStatus,
            ComplaintStatus toStatus,
            String actorName,
            String note,
            Instant createdAt
    ) {
    }

    public record Response(
            UUID id,
            UUID flatId,
            String flatNumber,
            String title,
            String category,
            String description,
            ComplaintStatus status,
            UUID assigneeUserId,
            String assigneeName,
            String resolutionNotes,
            String evidenceUrl,
            Instant createdAt,
            List<CommentResponse> comments,
            List<HistoryResponse> statusHistory
    ) {
    }
}
