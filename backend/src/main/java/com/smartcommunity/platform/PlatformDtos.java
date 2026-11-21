package com.smartcommunity.platform;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class PlatformDtos {
    private PlatformDtos() {
    }

    public record UpsertSubscriptionRequest(
            @NotBlank @Size(max = 40) String planCode,
            @NotBlank @Size(max = 120) String planName,
            @NotBlank @Size(max = 20) String status,
            @NotNull @DecimalMin("0.0") BigDecimal amountMonthly,
            Integer seatsIncluded,
            String featuresJson,
            @Size(max = 500) String paymentLink,
            LocalDate nextDueOn,
            @Size(max = 500) String notes
    ) {
    }

    public record RecordPlatformPaymentRequest(
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotNull LocalDate paidOn,
            @NotBlank @Size(max = 40) String method,
            @Size(max = 120) String reference,
            @Size(max = 500) String notes
    ) {
    }

    public record SubscriptionPaymentResponse(
            UUID id,
            BigDecimal amount,
            String currency,
            LocalDate paidOn,
            String method,
            String reference,
            String notes
    ) {
    }

    public record SubscriptionResponse(
            UUID id,
            UUID apartmentId,
            String apartmentName,
            String planCode,
            String planName,
            String status,
            BigDecimal amountMonthly,
            String currency,
            int seatsIncluded,
            String featuresJson,
            String paymentLink,
            LocalDate nextDueOn,
            String notes,
            BigDecimal collectedTotal,
            long activeUsers,
            long totalUsers
    ) {
    }

    public record PlatformSummaryResponse(
            long societiesActive,
            long societiesTotal,
            long usersActive,
            long usersTotal,
            long flatsTotal,
            BigDecimal mrr,
            BigDecimal collectedTotal,
            BigDecimal outstandingEstimate,
            long subscriptionsActive,
            long subscriptionsTrial,
            long subscriptionsPastDue,
            List<SubscriptionResponse> subscriptions
    ) {
    }
}
