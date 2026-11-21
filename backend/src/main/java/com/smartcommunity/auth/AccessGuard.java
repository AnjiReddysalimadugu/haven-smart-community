package com.smartcommunity.auth;

import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.common.ResourceNotFoundException;
import com.smartcommunity.property.Flat;
import com.smartcommunity.property.FlatRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

@Component
public class AccessGuard {
    private static final Set<Role> SOCIETY_OPERATORS = EnumSet.of(
            Role.SUPER_ADMIN, Role.APARTMENT_ADMIN, Role.ADMIN, Role.STAFF, Role.SECURITY);

    private final FlatRepository flats;

    public AccessGuard(FlatRepository flats) {
        this.flats = flats;
    }

    public boolean isSuperAdmin(UserPrincipal actor) {
        return actor.getRole() == Role.SUPER_ADMIN;
    }

    public boolean isSocietyAdmin(UserPrincipal actor) {
        Role role = actor.getRole();
        return role == Role.SUPER_ADMIN || role == Role.APARTMENT_ADMIN || role == Role.ADMIN;
    }

    public UUID resolveApartmentScope(UserPrincipal actor, UUID requestedApartmentId) {
        if (isSuperAdmin(actor)) {
            if (requestedApartmentId == null) {
                throw new InvalidRequestException("apartmentId is required");
            }
            return requestedApartmentId;
        }
        if (actor.getApartmentId() == null) {
            throw new AccessDeniedException("Your account is not linked to an apartment");
        }
        if (requestedApartmentId != null && !requestedApartmentId.equals(actor.getApartmentId())) {
            throw new AccessDeniedException("Apartment is outside your society");
        }
        return actor.getApartmentId();
    }

    public void requireApartmentAccess(UserPrincipal actor, UUID apartmentId) {
        if (apartmentId == null) {
            throw new InvalidRequestException("Apartment id is required");
        }
        if (isSuperAdmin(actor)) {
            return;
        }
        if (actor.getApartmentId() == null || !actor.getApartmentId().equals(apartmentId)) {
            throw new AccessDeniedException("Apartment is outside your society");
        }
    }

    public Flat requireAccessibleFlat(UserPrincipal actor, UUID flatId) {
        Flat flat = flats.findById(flatId)
                .orElseThrow(() -> new ResourceNotFoundException("Flat not found"));
        UUID apartmentId = flat.getFloor().getBlock().getApartment().getId();

        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null || !actor.getFlatId().equals(flatId)) {
                throw new AccessDeniedException("Residents can only access their own flat");
            }
            return flat;
        }

        if (isSuperAdmin(actor)) {
            return flat;
        }

        if (actor.getApartmentId() == null || !actor.getApartmentId().equals(apartmentId)) {
            throw new AccessDeniedException("Flat is outside your society");
        }

        if (!SOCIETY_OPERATORS.contains(actor.getRole()) && actor.getRole() != Role.RESIDENT) {
            throw new AccessDeniedException("You do not have permission to access this flat");
        }
        return flat;
    }

    public void requireResidentSelfOrAdmin(UserPrincipal actor, UUID residentUserId) {
        if (isSocietyAdmin(actor)) {
            return;
        }
        if (actor.getRole() == Role.RESIDENT && residentUserId != null && residentUserId.equals(actor.getId())) {
            return;
        }
        throw new AccessDeniedException("You do not have permission to view this resident");
    }
}
