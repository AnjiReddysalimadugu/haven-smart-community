package com.smartcommunity.visitor;

import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.smartcommunity.visitor.VisitorDtos.*;

@RestController
@RequestMapping("/api/v1/visitors")
public class VisitorController {
    private final VisitorService service;

    public VisitorController(VisitorService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','SECURITY','RESIDENT')")
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

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','SECURITY','RESIDENT')")
    @PostMapping
    public ResponseEntity<CreatedVisitorResponse> create(@Valid @RequestBody CreateVisitorRequest r,
                                                         @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(service.create(r, principal));
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @PostMapping("/{id}/approve")
    public VisitorResponse approve(@PathVariable UUID id,
                                   @AuthenticationPrincipal UserPrincipal principal) {
        return service.approve(id, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @PostMapping("/{id}/reject")
    public VisitorResponse reject(@PathVariable UUID id,
                                  @RequestBody(required = false) RejectRequest r,
                                  @AuthenticationPrincipal UserPrincipal principal) {
        return service.reject(id, r == null ? new RejectRequest(null) : r, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','SECURITY')")
    @PostMapping("/validate")
    public ValidationResponse validate(@Valid @RequestBody ValidateRequest r,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        return service.validate(r, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','SECURITY')")
    @PostMapping("/exit")
    public VisitorResponse exitByToken(@Valid @RequestBody ExitRequest r,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        return service.checkoutByToken(r, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','SECURITY')")
    @PostMapping("/{id}/exit")
    public VisitorResponse exit(@PathVariable UUID id,
                                @AuthenticationPrincipal UserPrincipal principal) {
        return service.checkout(id, principal);
    }
}
