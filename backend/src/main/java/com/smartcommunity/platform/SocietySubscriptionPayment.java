package com.smartcommunity.platform;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "society_subscription_payments")
public class SocietySubscriptionPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "subscription_id", nullable = false)
    private UUID subscriptionId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 8)
    private String currency = "INR";

    @Column(name = "paid_on", nullable = false)
    private LocalDate paidOn;

    @Column(nullable = false, length = 40)
    private String method = "UPI";

    @Column(length = 120)
    private String reference;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected SocietySubscriptionPayment() {
    }

    public SocietySubscriptionPayment(UUID subscriptionId, BigDecimal amount, LocalDate paidOn,
                                      String method, String reference, String notes) {
        this.subscriptionId = subscriptionId;
        this.amount = amount;
        this.paidOn = paidOn;
        this.method = method == null || method.isBlank() ? "UPI" : method.trim();
        this.reference = reference;
        this.notes = notes;
    }

    public UUID getId() { return id; }
    public UUID getSubscriptionId() { return subscriptionId; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public LocalDate getPaidOn() { return paidOn; }
    public String getMethod() { return method; }
    public String getReference() { return reference; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
