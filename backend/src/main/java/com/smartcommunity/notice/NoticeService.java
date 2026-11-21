package com.smartcommunity.notice;

import com.smartcommunity.audit.AuditService;
import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.common.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.notice.NoticeDtos.*;

@Service
@Transactional
public class NoticeService {
    private final NoticeRepository repo;
    private final AccessGuard accessGuard;
    private final AuditService audit;

    public NoticeService(NoticeRepository repo, AccessGuard accessGuard, AuditService audit) {
        this.repo = repo;
        this.accessGuard = accessGuard;
        this.audit = audit;
    }

    public Response create(CreateRequest r, UserPrincipal actor) {
        UUID apartmentId = accessGuard.resolveApartmentScope(actor, r.apartmentId());
        accessGuard.requireApartmentAccess(actor, apartmentId);
        Notice saved = repo.save(new Notice(
                apartmentId, r.title().trim(), r.body().trim(), r.expiresAt(), actor.getId()));
        audit.record(actor, "NOTICE_CREATE", "NOTICE", saved.getId(),
                "Published notice: " + saved.getTitle(), apartmentId);
        return map(saved);
    }

    public Response update(UUID id, UpdateRequest r, UserPrincipal actor) {
        Notice notice = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Notice not found"));
        accessGuard.requireApartmentAccess(actor, notice.getApartmentId());
        notice.update(r.title().trim(), r.body().trim(), r.expiresAt());
        return map(notice);
    }

    public Response deactivate(UUID id, UserPrincipal actor) {
        Notice notice = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Notice not found"));
        accessGuard.requireApartmentAccess(actor, notice.getApartmentId());
        notice.deactivate();
        audit.record(actor, "NOTICE_DEACTIVATE", "NOTICE", notice.getId(),
                "Deactivated notice: " + notice.getTitle(), notice.getApartmentId());
        return map(notice);
    }

    @Transactional(readOnly = true)
    public List<Response> list(UserPrincipal actor, UUID apartmentId) {
        UUID scope;
        if (accessGuard.isSuperAdmin(actor)) {
            scope = apartmentId;
            if (scope == null) {
                throw new InvalidRequestException("apartmentId is required for platform admins");
            }
        } else {
            scope = actor.getApartmentId();
            if (scope == null) {
                throw new InvalidRequestException("Apartment scope is required");
            }
            if (apartmentId != null && !apartmentId.equals(scope)) {
                throw new InvalidRequestException("Cannot access another society's notices");
            }
        }
        accessGuard.requireApartmentAccess(actor, scope);
        boolean adminView = accessGuard.isSocietyAdmin(actor);
        List<Notice> notices = adminView
                ? repo.findByApartmentIdOrderByPublishedAtDesc(scope)
                : repo.findByApartmentIdAndActiveTrueOrderByPublishedAtDesc(scope);
        return notices.stream()
                .filter(n -> adminView || n.isCurrentlyVisible())
                .map(this::map)
                .toList();
    }

    private Response map(Notice n) {
        return new Response(n.getId(), n.getApartmentId(), n.getTitle(), n.getBody(),
                n.getPublishedAt(), n.getExpiresAt(), n.isActive(), n.getCreatedAt());
    }
}
