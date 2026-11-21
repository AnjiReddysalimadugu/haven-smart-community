package com.smartcommunity.visitor;

import com.smartcommunity.audit.AuditService;
import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.AppUserRepository;
import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.common.*;
import com.smartcommunity.mail.EmailService;
import com.smartcommunity.notify.PushNotificationService;
import com.smartcommunity.property.Flat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import static com.smartcommunity.visitor.VisitorDtos.*;

@Service
@Transactional
public class VisitorService {
    private static final Logger log = LoggerFactory.getLogger(VisitorService.class);

    private final VisitorRepository visitors;
    private final AppUserRepository users;
    private final AccessGuard accessGuard;
    private final EmailService emailService;
    private final PushNotificationService push;
    private final AuditService audit;

    public VisitorService(VisitorRepository visitors, AppUserRepository users,
                          AccessGuard accessGuard, EmailService emailService,
                          PushNotificationService push, AuditService audit) {
        this.visitors = visitors;
        this.users = users;
        this.accessGuard = accessGuard;
        this.emailService = emailService;
        this.push = push;
        this.audit = audit;
    }

    public CreatedVisitorResponse create(CreateVisitorRequest r, UserPrincipal actor) {
        UUID flatId = actor.getRole() == Role.RESIDENT ? actor.getFlatId() : r.flatId();
        if (flatId == null) {
            throw new InvalidRequestException("A flat is required to create a visitor pass");
        }
        Flat flat = accessGuard.requireAccessibleFlat(actor, flatId);
        String token = UUID.randomUUID() + UUID.randomUUID().toString().replace("-", "");
        int minutes = r.validityMinutes() == null ? 120 : r.validityMinutes();

        // Gate / security walk-ins need resident approval; resident invites are auto-approved.
        boolean needsApproval = actor.getRole() == Role.SECURITY
                || Boolean.TRUE.equals(r.requiresApproval());
        if (actor.getRole() == Role.RESIDENT) {
            needsApproval = false;
        }
        VisitorApprovalStatus status = needsApproval
                ? VisitorApprovalStatus.PENDING
                : VisitorApprovalStatus.APPROVED;

        VisitorPass pass = visitors.save(new VisitorPass(
                flat, r.visitorName(), r.mobile(), r.visitType().toUpperCase(),
                hash(token), Instant.now().plusSeconds(minutes * 60L), status, actor.getId()));

        UUID aptId = flat.getFloor().getBlock().getApartment().getId();
        audit.record(actor, "VISITOR_CREATE", "VISITOR_PASS", pass.getId(),
                "Created visitor " + pass.getVisitorName() + " (" + status + ")", aptId);

        if (status == VisitorApprovalStatus.PENDING) {
            users.findFirstByFlatIdAndRoleAndActiveTrue(flatId, Role.RESIDENT).ifPresent(resident ->
                    push.sendToUser(resident.getId(), "Visitor approval needed",
                            pass.getVisitorName() + " waiting at gate · Flat " + flat.getFlatNumber(),
                            java.util.Map.of("type", "visitor_approval", "visitorId", pass.getId().toString())));
        } else if (emailService.isEnabled()) {
            users.findFirstByFlatIdAndRoleAndActiveTrue(flatId, Role.RESIDENT).ifPresent(resident -> {
                try {
                    emailService.sendVisitorPass(
                            resident.getEmail(), resident.getFullName(),
                            pass.getVisitorName(), flat.getFlatNumber(), pass.getVisitType(),
                            pass.getExpiresAt(), token);
                } catch (Exception ex) {
                    log.warn("Visitor pass email skipped: {}", ex.getMessage());
                }
            });
        }

        return new CreatedVisitorResponse(pass.getId(), pass.getVisitorName(), pass.getVisitType(),
                token, pass.getExpiresAt(), flat.getId(), pass.getApprovalStatus());
    }

    public VisitorResponse approve(UUID id, UserPrincipal actor) {
        VisitorPass pass = visitors.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor pass not found"));
        requireResidentOrAdminForFlat(actor, pass);
        pass.approve(actor.getId());
        UUID aptId = pass.getFlat().getFloor().getBlock().getApartment().getId();
        audit.record(actor, "VISITOR_APPROVE", "VISITOR_PASS", pass.getId(),
                "Approved visitor " + pass.getVisitorName(), aptId);
        return map(pass);
    }

    public VisitorResponse reject(UUID id, RejectRequest r, UserPrincipal actor) {
        VisitorPass pass = visitors.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor pass not found"));
        requireResidentOrAdminForFlat(actor, pass);
        pass.reject(actor.getId(), r == null ? null : r.reason());
        UUID aptId = pass.getFlat().getFloor().getBlock().getApartment().getId();
        audit.record(actor, "VISITOR_REJECT", "VISITOR_PASS", pass.getId(),
                "Rejected visitor " + pass.getVisitorName(), aptId);
        return map(pass);
    }

    public ValidationResponse validate(ValidateRequest r, UserPrincipal actor) {
        VisitorPass pass = visitors.findByTokenHash(hash(r.qrToken())).orElse(null);
        if (pass == null) {
            // Soft-fail for gate scanners — unknown/invalid QR should not look like a transport error.
            return new ValidationResponse(false, "Visitor pass not found", null, null, null);
        }
        accessGuard.requireAccessibleFlat(actor, pass.getFlat().getId());
        if (pass.getApprovalStatus() == VisitorApprovalStatus.PENDING) {
            return new ValidationResponse(false, "Awaiting resident approval", pass.getId(), pass.getVisitorName(),
                    pass.getFlat().getFlatNumber());
        }
        if (pass.getApprovalStatus() == VisitorApprovalStatus.REJECTED) {
            return new ValidationResponse(false, "Visitor request was rejected", pass.getId(), pass.getVisitorName(),
                    pass.getFlat().getFlatNumber());
        }
        if (pass.isUsed()) {
            return new ValidationResponse(false, "Pass already used", pass.getId(), pass.getVisitorName(),
                    pass.getFlat().getFlatNumber());
        }
        if (pass.getExpiresAt().isBefore(Instant.now())) {
            return new ValidationResponse(false, "Pass expired", pass.getId(), pass.getVisitorName(),
                    pass.getFlat().getFlatNumber());
        }
        pass.enter();
        UUID aptId = pass.getFlat().getFloor().getBlock().getApartment().getId();
        audit.record(actor, "VISITOR_ENTRY", "VISITOR_PASS", pass.getId(),
                "Checked in " + pass.getVisitorName(), aptId);
        users.findFirstByFlatIdAndRoleAndActiveTrue(pass.getFlat().getId(), Role.RESIDENT).ifPresent(resident ->
                push.sendToUser(resident.getId(), "Guest at gate",
                        pass.getVisitorName() + " · Flat " + pass.getFlat().getFlatNumber(),
                        java.util.Map.of("type", "visitor_entry", "visitorId", pass.getId().toString())));
        return new ValidationResponse(true, "Entry approved", pass.getId(), pass.getVisitorName(),
                pass.getFlat().getFlatNumber());
    }

    public VisitorResponse checkout(UUID id, UserPrincipal actor) {
        VisitorPass pass = visitors.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor pass not found"));
        accessGuard.requireAccessibleFlat(actor, pass.getFlat().getId());
        pass.exit();
        UUID aptId = pass.getFlat().getFloor().getBlock().getApartment().getId();
        audit.record(actor, "VISITOR_EXIT", "VISITOR_PASS", pass.getId(),
                "Checked out " + pass.getVisitorName(), aptId);
        return map(pass);
    }

    public VisitorResponse checkoutByToken(ExitRequest r, UserPrincipal actor) {
        VisitorPass pass = visitors.findByTokenHash(hash(r.qrToken().trim()))
                .orElseThrow(() -> new ResourceNotFoundException("Visitor pass not found"));
        accessGuard.requireAccessibleFlat(actor, pass.getFlat().getId());
        pass.exit();
        UUID aptId = pass.getFlat().getFloor().getBlock().getApartment().getId();
        audit.record(actor, "VISITOR_EXIT", "VISITOR_PASS", pass.getId(),
                "Checked out " + pass.getVisitorName(), aptId);
        return map(pass);
    }

    @Transactional(readOnly = true)
    public List<VisitorResponse> all(UserPrincipal actor, UUID apartmentId) {
        return scoped(actor, apartmentId).stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<VisitorResponse> page(UserPrincipal actor, UUID apartmentId, int page, int size) {
        return PageResponse.of(all(actor, apartmentId), page, size);
    }

    private void requireResidentOrAdminForFlat(UserPrincipal actor, VisitorPass pass) {
        accessGuard.requireAccessibleFlat(actor, pass.getFlat().getId());
        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null || !actor.getFlatId().equals(pass.getFlat().getId())) {
                throw new AccessDeniedException("Residents can only approve visitors for their own flat");
            }
            return;
        }
        if (!accessGuard.isSocietyAdmin(actor) && actor.getRole() != Role.STAFF) {
            throw new AccessDeniedException("Not allowed to approve visitor requests");
        }
    }

    private List<VisitorPass> scoped(UserPrincipal actor, UUID apartmentId) {
        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null) return List.of();
            return visitors.findByFlatIdOrderByCreatedAtDesc(actor.getFlatId());
        }
        if (accessGuard.isSuperAdmin(actor)) {
            if (apartmentId != null) {
                return visitors.findByApartmentIdOrderByCreatedAtDesc(apartmentId);
            }
            return visitors.findAllByOrderByCreatedAtDesc();
        }
        if (actor.getApartmentId() != null) {
            return visitors.findByApartmentIdOrderByCreatedAtDesc(actor.getApartmentId());
        }
        return List.of();
    }

    private VisitorResponse map(VisitorPass p) {
        return new VisitorResponse(p.getId(), p.getFlat().getId(), p.getFlat().getFlatNumber(),
                p.getVisitorName(), p.getMobile(), p.getVisitType(), p.getExpiresAt(), p.isUsed(),
                p.getEntryAt(), p.getExitAt(), p.getApprovalStatus(), p.getApprovedAt(), p.getRejectionReason());
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
