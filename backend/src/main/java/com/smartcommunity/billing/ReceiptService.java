package com.smartcommunity.billing;

import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.smartcommunity.billing.ReceiptDtos.ReceiptResponse;

@Service
@Transactional(readOnly = true)
public class ReceiptService {
    private final BillPaymentRepository payments;
    private final AccessGuard accessGuard;

    public ReceiptService(BillPaymentRepository payments, AccessGuard accessGuard) {
        this.payments = payments;
        this.accessGuard = accessGuard;
    }

    public List<ReceiptResponse> all(UserPrincipal actor) {
        return scoped(actor).stream().map(this::map).toList();
    }

    private List<BillPayment> scoped(UserPrincipal actor) {
        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null) return List.of();
            return payments.findByFlatIdOrderByPaidAtDesc(actor.getFlatId());
        }
        if (accessGuard.isSuperAdmin(actor)) {
            return payments.findAllByOrderByPaidAtDesc();
        }
        if (actor.getApartmentId() != null) {
            return payments.findByApartmentIdOrderByPaidAtDesc(actor.getApartmentId());
        }
        return List.of();
    }

    private ReceiptResponse map(BillPayment p) {
        Bill bill = p.getBill();
        return new ReceiptResponse(
                p.getId(),
                p.getReceiptNumber(),
                bill.getId(),
                bill.getFlat().getId(),
                bill.getFlat().getFlatNumber(),
                bill.getBillType(),
                bill.getBillingPeriod(),
                p.getAmount(),
                p.getMethod(),
                p.getReference(),
                p.getPaidAt(),
                bill.getStatus()
        );
    }
}
