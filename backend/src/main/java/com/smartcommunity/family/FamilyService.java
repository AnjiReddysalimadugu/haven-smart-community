package com.smartcommunity.family;

import com.smartcommunity.audit.AuditService;
import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.common.BusinessException;
import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.common.ResourceNotFoundException;
import com.smartcommunity.property.Flat;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.family.FamilyDtos.*;

@Service
@Transactional
public class FamilyService {
    private final FamilyMemberRepository repo;
    private final AccessGuard accessGuard;
    private final AuditService audit;

    public FamilyService(FamilyMemberRepository repo, AccessGuard accessGuard, AuditService audit) {
        this.repo = repo;
        this.accessGuard = accessGuard;
        this.audit = audit;
    }

    public Response create(CreateRequest r, UserPrincipal actor) {
        UUID flatId = actor.getRole() == Role.RESIDENT ? actor.getFlatId() : r.flatId();
        if (flatId == null) {
            throw new InvalidRequestException("A flat is required");
        }
        Flat flat = accessGuard.requireAccessibleFlat(actor, flatId);
        String name = r.fullName().trim();
        String relation = r.relation().trim().toUpperCase();
        if (repo.existsByFlatIdAndFullNameIgnoreCaseAndRelationIgnoreCaseAndActiveTrue(flatId, name, relation)) {
            throw new BusinessException("An active family member with this name and relation already exists");
        }
        if (r.age() != null && (r.age() < 0 || r.age() > 120)) {
            throw new InvalidRequestException("Age must be between 0 and 120");
        }
        FamilyMember saved = repo.save(new FamilyMember(
                flat, name, relation,
                blankToNull(r.mobile()), r.age()));
        UUID aptId = flat.getFloor().getBlock().getApartment().getId();
        audit.record(actor, "FAMILY_CREATE", "FAMILY_MEMBER", saved.getId(),
                "Added family member " + name, aptId);
        return map(saved);
    }

    public Response update(UUID id, UpdateRequest r, UserPrincipal actor) {
        FamilyMember member = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Family member not found"));
        accessGuard.requireAccessibleFlat(actor, member.getFlat().getId());
        if (!member.isActive()) {
            throw new InvalidRequestException("Cannot edit a deactivated family member");
        }
        member.update(r.fullName().trim(), r.relation().trim().toUpperCase(),
                blankToNull(r.mobile()), r.age());
        return map(member);
    }

    public Response deactivate(UUID id, UserPrincipal actor) {
        FamilyMember member = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Family member not found"));
        accessGuard.requireAccessibleFlat(actor, member.getFlat().getId());
        member.deactivate();
        UUID aptId = member.getFlat().getFloor().getBlock().getApartment().getId();
        audit.record(actor, "FAMILY_DEACTIVATE", "FAMILY_MEMBER", member.getId(),
                "Deactivated family member " + member.getFullName(), aptId);
        return map(member);
    }

    @Transactional(readOnly = true)
    public List<Response> list(UserPrincipal actor, UUID apartmentId, UUID flatId) {
        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null) return List.of();
            return repo.findByFlatIdAndActiveTrueOrderByFullNameAsc(actor.getFlatId()).stream().map(this::map).toList();
        }
        if (flatId != null) {
            accessGuard.requireAccessibleFlat(actor, flatId);
            return repo.findByFlatIdOrderByFullNameAsc(flatId).stream().map(this::map).toList();
        }
        UUID scope = accessGuard.isSuperAdmin(actor)
                ? apartmentId
                : actor.getApartmentId();
        if (scope == null) {
            if (accessGuard.isSuperAdmin(actor)) {
                return repo.findAll().stream().map(this::map).toList();
            }
            throw new InvalidRequestException("Apartment scope is required");
        }
        accessGuard.requireApartmentAccess(actor, scope);
        return repo.findActiveByApartmentId(scope).stream().map(this::map).toList();
    }

    private Response map(FamilyMember m) {
        return new Response(
                m.getId(), m.getFlat().getId(), m.getFlat().getFlatNumber(),
                m.getFullName(), m.getRelation(), m.getMobile(), m.getAge(),
                m.isActive(), m.getCreatedAt());
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
