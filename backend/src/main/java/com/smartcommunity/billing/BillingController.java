package com.smartcommunity.billing;

import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.smartcommunity.billing.BillingDtos.*;

@RestController
@RequestMapping("/api/v1/bills")
public class BillingController {
    private final BillingService service;

    public BillingController(BillingService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @GetMapping
    public Object all(@RequestParam(required = false) UUID apartmentId,
                      @RequestParam(required = false) Integer page,
                      @RequestParam(required = false) Integer size,
                      @AuthenticationPrincipal UserPrincipal principal) {
        if (page != null) {
            return service.page(principal, apartmentId, page, size == null ? 20 : size);
        }
        return service.all(principal, apartmentId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @PostMapping
    public ResponseEntity<BillResponse> create(@Valid @RequestBody CreateBillRequest r,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(service.create(r, principal));
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @PostMapping("/{id}/payments")
    public BillResponse pay(@PathVariable UUID id, @Valid @RequestBody PaymentRequest r,
                            @AuthenticationPrincipal UserPrincipal principal) {
        return service.pay(id, r, principal);
    }

    /** Correction workflow — never deletes payment rows; records a REFUND ledger entry. */
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN','STAFF','RESIDENT')")
    @PostMapping("/{id}/refunds")
    public BillResponse refund(@PathVariable UUID id, @Valid @RequestBody RefundRequest r,
                               @AuthenticationPrincipal UserPrincipal principal) {
        return service.refund(id, r, principal);
    }
}
