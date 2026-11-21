package com.smartcommunity.billing;

import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.AppUser;
import com.smartcommunity.auth.AppUserRepository;
import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.audit.AuditService;
import com.smartcommunity.common.*;
import com.smartcommunity.mail.EmailService;
import com.smartcommunity.notify.PushNotificationService;
import com.smartcommunity.property.Flat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static com.smartcommunity.billing.BillingDtos.*;

@Service
@Transactional
public class BillingService {
    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    private final BillRepository bills;
    private final BillPaymentRepository payments;
    private final AppUserRepository users;
    private final AccessGuard accessGuard;
    private final EmailService emailService;
    private final PushNotificationService push;
    private final AuditService audit;

    public BillingService(BillRepository bills, BillPaymentRepository payments, AppUserRepository users,
                          AccessGuard accessGuard, EmailService emailService, PushNotificationService push,
                          AuditService audit) {
        this.bills = bills;
        this.payments = payments;
        this.users = users;
        this.accessGuard = accessGuard;
        this.emailService = emailService;
        this.push = push;
        this.audit = audit;
    }

    public BillResponse create(CreateBillRequest r, UserPrincipal actor) {
        Flat flat = accessGuard.requireAccessibleFlat(actor, r.flatId());
        if (bills.existsByFlatIdAndBillTypeAndBillingPeriod(flat.getId(), r.billType(), r.billingPeriod())) {
            throw new BusinessException("A bill of this type already exists for this flat and period");
        }
        Bill bill = bills.save(new Bill(flat, r.billType().toUpperCase(), r.billingPeriod(), r.amount(), r.dueDate()));
        UUID aptId = flat.getFloor().getBlock().getApartment().getId();
        audit.record(actor, "BILL_CREATE", "BILL", bill.getId(),
                bill.getBillType() + " " + bill.getBillingPeriod() + " · " + flat.getFlatNumber(), aptId);
        notifyBillCreated(bill);
        return map(bill);
    }

    @Transactional(readOnly = true)
    public List<BillResponse> all(UserPrincipal actor, UUID apartmentId) {
        return scoped(actor, apartmentId).stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<BillResponse> page(UserPrincipal actor, UUID apartmentId, int page, int size) {
        return PageResponse.of(all(actor, apartmentId), page, size);
    }

    public BillResponse pay(UUID id, PaymentRequest r, UserPrincipal actor) {
        Bill bill = bills.findById(id).orElseThrow(() -> new ResourceNotFoundException("Bill not found"));
        accessGuard.requireAccessibleFlat(actor, bill.getFlat().getId());
        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null || !actor.getFlatId().equals(bill.getFlat().getId())) {
                throw new InvalidRequestException("Residents can only pay bills for their own flat");
            }
        }
        BigDecimal balance = bill.getAmount().subtract(bill.getPaidAmount());
        if (r.amount().compareTo(balance) > 0) {
            throw new InvalidRequestException("Payment exceeds outstanding balance");
        }
        bill.recordPayment(r.amount());
        String receiptNumber = "RCPT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        BillPayment payment = payments.save(new BillPayment(
                bill, r.amount(), r.method().toUpperCase(), r.reference(), receiptNumber));
        UUID aptId = bill.getFlat().getFloor().getBlock().getApartment().getId();
        audit.record(actor, "BILL_PAY", "BILL_PAYMENT", payment.getId(),
                receiptNumber + " · " + r.amount() + " · " + bill.getFlat().getFlatNumber(), aptId);
        notifyPaymentReceipt(bill, payment);
        return map(bill);
    }

    public BillResponse refund(UUID id, RefundRequest r, UserPrincipal actor) {
        Bill bill = bills.findById(id).orElseThrow(() -> new ResourceNotFoundException("Bill not found"));
        // Residents may refund only their own flat bills (enforced by requireAccessibleFlat).
        accessGuard.requireAccessibleFlat(actor, bill.getFlat().getId());
        if (bill.getPaidAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException("No payments to refund on this bill");
        }
        if (r.amount().compareTo(bill.getPaidAmount()) > 0) {
            throw new InvalidRequestException("Refund exceeds paid amount");
        }
        try {
            bill.recordRefund(r.amount());
        } catch (IllegalArgumentException ex) {
            throw new InvalidRequestException(ex.getMessage());
        }
        String receiptNumber = "RFND-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        String reference = (r.reference() == null || r.reference().isBlank())
                ? ("REFUND · " + r.reason().trim())
                : r.reference().trim();
        if (reference.length() > 80) {
            reference = reference.substring(0, 80);
        }
        BillPayment payment = payments.save(new BillPayment(
                bill, r.amount().negate(), "REFUND", reference, receiptNumber));
        UUID aptId = bill.getFlat().getFloor().getBlock().getApartment().getId();
        audit.record(actor, "BILL_REFUND", "BILL_PAYMENT", payment.getId(),
                receiptNumber + " · -" + r.amount() + " · " + r.reason().trim(), aptId);
        return map(bill);
    }

    private List<Bill> scoped(UserPrincipal actor, UUID apartmentId) {
        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null) return List.of();
            return bills.findByFlatIdOrderByCreatedAtDesc(actor.getFlatId());
        }
        if (accessGuard.isSuperAdmin(actor)) {
            if (apartmentId != null) {
                return bills.findByApartmentIdOrderByCreatedAtDesc(apartmentId);
            }
            return bills.findAllByOrderByCreatedAtDesc();
        }
        if (actor.getApartmentId() != null) {
            return bills.findByApartmentIdOrderByCreatedAtDesc(actor.getApartmentId());
        }
        return List.of();
    }

    private void notifyBillCreated(Bill bill) {
        findResidentEmail(bill.getFlat().getId()).ifPresent(user -> {
            push.sendToUser(user.getId(), "New bill",
                    bill.getBillType() + " · ₹" + bill.getAmount() + " due",
                    java.util.Map.of("type", "bill", "billId", bill.getId().toString()));
            if (!emailService.isEnabled()) return;
            try {
                emailService.sendBillCreated(
                        user.getEmail(), user.getFullName(),
                        bill.getFlat().getFlatNumber(), bill.getBillType(),
                        bill.getBillingPeriod(), bill.getAmount(), bill.getDueDate());
            } catch (Exception ex) {
                log.warn("Bill email skipped for {}: {}", user.getEmail(), ex.getMessage());
            }
        });
    }

    private void notifyPaymentReceipt(Bill bill, BillPayment payment) {
        if (!emailService.isEnabled()) return;
        findResidentEmail(bill.getFlat().getId()).ifPresent(user -> {
            try {
                emailService.sendPaymentReceipt(
                        user.getEmail(), user.getFullName(),
                        bill.getFlat().getFlatNumber(), bill.getBillType(),
                        bill.getBillingPeriod(), payment.getAmount(),
                        payment.getMethod(), payment.getReceiptNumber());
            } catch (Exception ex) {
                log.warn("Receipt email skipped for {}: {}", user.getEmail(), ex.getMessage());
            }
        });
    }

    private java.util.Optional<AppUser> findResidentEmail(UUID flatId) {
        return users.findFirstByFlatIdAndRoleAndActiveTrue(flatId, Role.RESIDENT);
    }

    private BillResponse map(Bill b) {
        return new BillResponse(
                b.getId(), b.getFlat().getId(), b.getFlat().getFlatNumber(), b.getBillType(),
                b.getBillingPeriod(), b.getAmount(), b.getPaidAmount(),
                b.getAmount().subtract(b.getPaidAmount()), b.getDueDate(), b.getStatus());
    }
}
