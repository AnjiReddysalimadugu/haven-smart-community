package com.smartcommunity.billing;

import com.smartcommunity.auth.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.smartcommunity.billing.ReceiptDtos.ReceiptResponse;

@RestController
@RequestMapping("/api/v1/receipts")
public class ReceiptController {
    private final ReceiptService service;

    public ReceiptController(ReceiptService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @GetMapping
    public List<ReceiptResponse> all(@AuthenticationPrincipal UserPrincipal principal) {
        return service.all(principal);
    }
}
