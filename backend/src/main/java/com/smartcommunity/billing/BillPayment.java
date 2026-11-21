package com.smartcommunity.billing;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bill_payments")
public class BillPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bill_id")
    private Bill bill;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 40)
    private String method;

    @Column(nullable = false, length = 80)
    private String reference;

    @Column(name = "receipt_number", nullable = false, unique = true, length = 40)
    private String receiptNumber;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt = Instant.now();

    protected BillPayment() {
    }

    public BillPayment(Bill bill, BigDecimal amount, String method, String reference, String receiptNumber) {
        this.bill = bill;
        this.amount = amount;
        this.method = method;
        this.reference = reference;
        this.receiptNumber = receiptNumber;
    }

    public UUID getId() {
        return id;
    }

    public Bill getBill() {
        return bill;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getMethod() {
        return method;
    }

    public String getReference() {
        return reference;
    }

    public String getReceiptNumber() {
        return receiptNumber;
    }

    public Instant getPaidAt() {
        return paidAt;
    }
}
