package com.smartcommunity.audit;

import com.smartcommunity.auth.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AuditService {
    private final AuditEventRepository repo;

    public AuditService(AuditEventRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public void record(UserPrincipal actor, String action, String entityType, UUID entityId,
                       String summary, UUID apartmentId) {
        UUID actorId = actor == null ? null : actor.getId();
        String actorName = actor == null ? null : actor.getFullName();
        repo.save(new AuditEvent(action, entityType, entityId, summary, actorId, actorName, apartmentId));
    }

    @Transactional(readOnly = true)
    public List<AuditEvent> list(UUID apartmentId) {
        if (apartmentId == null) return repo.findTop100ByOrderByCreatedAtDesc();
        return repo.findTop100ByApartmentIdOrderByCreatedAtDesc(apartmentId);
    }
}
