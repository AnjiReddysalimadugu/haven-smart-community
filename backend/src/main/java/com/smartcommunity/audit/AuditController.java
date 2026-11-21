package com.smartcommunity.audit;

import com.smartcommunity.auth.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit-events")
public class AuditController {
    private final AuditService service;

    public AuditController(AuditService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN')")
    public List<AuditEventResponse> list(@RequestParam(required = false) UUID apartmentId,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        UUID scope = apartmentId;
        if (principal.getRole() != com.smartcommunity.auth.Role.SUPER_ADMIN) {
            scope = principal.getApartmentId();
        }
        return service.list(scope).stream().map(AuditEventResponse::from).toList();
    }

    public record AuditEventResponse(
            UUID id, String action, String entityType, UUID entityId, String summary,
            String actorName, UUID apartmentId, Instant createdAt
    ) {
        static AuditEventResponse from(AuditEvent e) {
            return new AuditEventResponse(
                    e.getId(), e.getAction(), e.getEntityType(), e.getEntityId(), e.getSummary(),
                    e.getActorName(), e.getApartmentId(), e.getCreatedAt()
            );
        }
    }
}
