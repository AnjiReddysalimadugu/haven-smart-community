package com.smartcommunity.platform;

import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.platform.PlatformDtos.*;

@RestController
@RequestMapping("/api/v1/platform")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class PlatformController {
    private final PlatformService service;

    public PlatformController(PlatformService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public PlatformSummaryResponse summary(@AuthenticationPrincipal UserPrincipal principal) {
        return service.summary(principal);
    }

    @GetMapping("/subscriptions")
    public List<SubscriptionResponse> subscriptions(@AuthenticationPrincipal UserPrincipal principal) {
        return service.listSubscriptions(principal);
    }

    @PutMapping("/societies/{apartmentId}/subscription")
    public SubscriptionResponse upsert(@PathVariable UUID apartmentId,
                                       @Valid @RequestBody UpsertSubscriptionRequest request,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        return service.upsert(apartmentId, request, principal);
    }

    @GetMapping("/societies/{apartmentId}/payments")
    public List<SubscriptionPaymentResponse> payments(@PathVariable UUID apartmentId,
                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return service.listPayments(apartmentId, principal);
    }

    @PostMapping("/societies/{apartmentId}/payments")
    public SubscriptionPaymentResponse recordPayment(@PathVariable UUID apartmentId,
                                                     @Valid @RequestBody RecordPlatformPaymentRequest request,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        return service.recordPayment(apartmentId, request, principal);
    }
}
