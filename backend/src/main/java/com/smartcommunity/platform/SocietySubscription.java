package com.smartcommunity.platform;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "society_subscriptions")
public class SocietySubscription {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "apartment_id", nullable = false, unique = true)
    private UUID apartmentId;

    @Column(name = "plan_code", nullable = false, length = 40)
    private String planCode;

    @Column(name = "plan_name", nullable = false, length = 120)
    private String planName;

    @Column(nullable = false, length = 20)
    private String status = "TRIAL";

    @Column(name = "amount_monthly", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountMonthly = BigDecimal.ZERO;

    @Column(nullable = false, length = 8)
    private String currency = "INR";

    @Column(name = "seats_included", nullable = false)
    private int seatsIncluded = 50;

    @Column(name = "features_json", nullable = false, columnDefinition = "TEXT")
    private String featuresJson = "[]";

    @Column(name = "payment_link", length = 500)
    private String paymentLink;

    @Column(name = "next_due_on")
    private LocalDate nextDueOn;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected SocietySubscription() {
    }

    public SocietySubscription(UUID apartmentId, String planCode, String planName, BigDecimal amountMonthly) {
        this.apartmentId = apartmentId;
        this.planCode = planCode;
        this.planName = planName;
        this.amountMonthly = amountMonthly == null ? BigDecimal.ZERO : amountMonthly;
    }

    public UUID getId() { return id; }
    public UUID getApartmentId() { return apartmentId; }
    public String getPlanCode() { return planCode; }
    public String getPlanName() { return planName; }
    public String getStatus() { return status; }
    public BigDecimal getAmountMonthly() { return amountMonthly; }
    public String getCurrency() { return currency; }
    public int getSeatsIncluded() { return seatsIncluded; }
    public String getFeaturesJson() { return featuresJson; }
    public String getPaymentLink() { return paymentLink; }
    public LocalDate getNextDueOn() { return nextDueOn; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void apply(String planCode, String planName, String status, BigDecimal amountMonthly,
                      Integer seatsIncluded, String featuresJson, String paymentLink,
                      LocalDate nextDueOn, String notes) {
        if (planCode != null && !planCode.isBlank()) this.planCode = planCode.trim();
        if (planName != null && !planName.isBlank()) this.planName = planName.trim();
        if (status != null && !status.isBlank()) this.status = status.trim().toUpperCase();
        if (amountMonthly != null) this.amountMonthly = amountMonthly;
        if (seatsIncluded != null && seatsIncluded > 0) this.seatsIncluded = seatsIncluded;
        if (featuresJson != null) this.featuresJson = featuresJson;
        if (paymentLink != null) this.paymentLink = paymentLink.isBlank() ? null : paymentLink.trim();
        if (nextDueOn != null) this.nextDueOn = nextDueOn;
        if (notes != null) this.notes = notes.isBlank() ? null : notes.trim();
        this.updatedAt = Instant.now();
    }
}
