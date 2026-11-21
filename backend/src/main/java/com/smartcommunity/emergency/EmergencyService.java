package com.smartcommunity.emergency;

import com.smartcommunity.audit.AuditService;
import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.common.BusinessException;
import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.common.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.emergency.EmergencyDtos.*;

@Service
@Transactional
public class EmergencyService {
    private final EmergencyContactRepository repo;
    private final AccessGuard accessGuard;
    private final AuditService audit;

    public EmergencyService(EmergencyContactRepository repo, AccessGuard accessGuard, AuditService audit) {
        this.repo = repo;
        this.accessGuard = accessGuard;
        this.audit = audit;
    }

    public Response create(CreateRequest r, UserPrincipal actor) {
        UUID apartmentId = accessGuard.resolveApartmentScope(actor, r.apartmentId());
        accessGuard.requireApartmentAccess(actor, apartmentId);
        String phone = r.phone().trim();
        if (repo.existsByApartmentIdAndPhoneAndActiveTrue(apartmentId, phone)) {
            throw new BusinessException("An active emergency contact with this phone already exists");
        }
        EmergencyContact saved = repo.save(new EmergencyContact(
                apartmentId, r.name().trim(), r.roleLabel().trim(), phone,
                r.sortOrder() == null ? 0 : r.sortOrder()));
        audit.record(actor, "EMERGENCY_CREATE", "EMERGENCY_CONTACT", saved.getId(),
                "Added emergency contact " + saved.getName(), apartmentId);
        return map(saved);
    }

    public Response update(UUID id, UpdateRequest r, UserPrincipal actor) {
        EmergencyContact contact = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Emergency contact not found"));
        accessGuard.requireApartmentAccess(actor, contact.getApartmentId());
        contact.update(r.name().trim(), r.roleLabel().trim(), r.phone().trim(),
                r.sortOrder() == null ? contact.getSortOrder() : r.sortOrder());
        return map(contact);
    }

    public Response deactivate(UUID id, UserPrincipal actor) {
        EmergencyContact contact = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Emergency contact not found"));
        accessGuard.requireApartmentAccess(actor, contact.getApartmentId());
        contact.deactivate();
        audit.record(actor, "EMERGENCY_DEACTIVATE", "EMERGENCY_CONTACT", contact.getId(),
                "Deactivated emergency contact " + contact.getName(), contact.getApartmentId());
        return map(contact);
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
        }
        accessGuard.requireApartmentAccess(actor, scope);
        List<EmergencyContact> list = accessGuard.isSocietyAdmin(actor)
                ? repo.findByApartmentIdOrderBySortOrderAscNameAsc(scope)
                : repo.findByApartmentIdAndActiveTrueOrderBySortOrderAscNameAsc(scope);
        return list.stream().filter(c -> accessGuard.isSocietyAdmin(actor) || c.isActive()).map(this::map).toList();
    }

    private Response map(EmergencyContact c) {
        return new Response(c.getId(), c.getApartmentId(), c.getName(), c.getRoleLabel(),
                c.getPhone(), c.getSortOrder(), c.isActive(), c.getCreatedAt());
    }
}
