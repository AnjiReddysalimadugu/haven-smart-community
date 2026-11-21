package com.smartcommunity.resident;

import com.smartcommunity.auth.*;
import com.smartcommunity.common.BusinessException;
import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.common.ResourceNotFoundException;
import com.smartcommunity.property.Apartment;
import com.smartcommunity.property.ApartmentRepository;
import com.smartcommunity.property.Flat;
import com.smartcommunity.property.FlatRepository;
import com.smartcommunity.property.OccupancyStatus;
import com.smartcommunity.property.FlatOccupancyRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.resident.ResidentDtos.*;

@Service
@Transactional
public class ResidentService {
    private final AppUserRepository users;
    private final ApartmentRepository apartments;
    private final FlatRepository flats;
    private final FlatOccupancyRepository occupancies;
    private final AccessGuard accessGuard;
    private final PasswordEncoder passwordEncoder;

    public ResidentService(AppUserRepository users, ApartmentRepository apartments, FlatRepository flats,
                           FlatOccupancyRepository occupancies, AccessGuard accessGuard,
                           PasswordEncoder passwordEncoder) {
        this.users = users;
        this.apartments = apartments;
        this.flats = flats;
        this.occupancies = occupancies;
        this.accessGuard = accessGuard;
        this.passwordEncoder = passwordEncoder;
    }

    public ResidentResponse register(RegisterRequest request, UserPrincipal actor) {
        if (!accessGuard.isSocietyAdmin(actor)) {
            throw new AccessDeniedException("Only society administrators can register residents");
        }
        UUID apartmentId = accessGuard.resolveApartmentScope(actor, request.apartmentId());
        apartments.findById(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found"));

        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("A user with this email already exists");
        }

        AppUser user = new AppUser(email, passwordEncoder.encode(request.password()),
                request.fullName().trim(), Role.RESIDENT);
        user.setApartmentId(apartmentId);
        user.setActive(true);
        return map(users.save(user));
    }

    @Transactional(readOnly = true)
    public List<ResidentResponse> list(UUID apartmentId, UserPrincipal actor) {
        if (actor.getRole() == Role.RESIDENT) {
            return users.findById(actor.getId()).stream().map(this::map).toList();
        }
        if (!accessGuard.isSocietyAdmin(actor) && actor.getRole() != Role.STAFF) {
            throw new AccessDeniedException("You do not have permission to list residents");
        }
        UUID scope = accessGuard.isSuperAdmin(actor)
                ? apartmentId
                : accessGuard.resolveApartmentScope(actor, apartmentId);
        if (accessGuard.isSuperAdmin(actor) && scope == null) {
            return users.findResidents(null).stream().map(this::map).toList();
        }
        accessGuard.requireApartmentAccess(actor, scope);
        return users.findResidents(scope).stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public ResidentResponse get(UUID id, UserPrincipal actor) {
        AppUser user = requireResident(id);
        accessGuard.requireResidentSelfOrAdmin(actor, user.getId());
        if (actor.getRole() != Role.RESIDENT) {
            if (user.getApartmentId() != null) {
                accessGuard.requireApartmentAccess(actor, user.getApartmentId());
            } else if (!accessGuard.isSuperAdmin(actor)) {
                throw new AccessDeniedException("Resident is outside your society");
            }
        }
        return map(user);
    }

    public ResidentResponse update(UUID id, UpdateRequest request, UserPrincipal actor) {
        AppUser user = requireResident(id);
        if (!accessGuard.isSocietyAdmin(actor)) {
            throw new AccessDeniedException("Only society administrators can update residents");
        }
        if (user.getApartmentId() != null) {
            accessGuard.requireApartmentAccess(actor, user.getApartmentId());
        }

        String email = request.email().trim().toLowerCase();
        if (!email.equalsIgnoreCase(user.getEmail()) && users.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("A user with this email already exists");
        }
        user.setEmail(email);
        user.setFullName(request.fullName().trim());
        if (StringUtils.hasText(request.password())) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        return map(users.save(user));
    }

    public ResidentResponse deactivate(UUID id, UserPrincipal actor) {
        AppUser user = requireResident(id);
        if (!accessGuard.isSocietyAdmin(actor)) {
            throw new AccessDeniedException("Only society administrators can deactivate residents");
        }
        if (user.getApartmentId() != null) {
            accessGuard.requireApartmentAccess(actor, user.getApartmentId());
        }
        if (occupancies.existsByResidentUserIdAndStatus(user.getId(), OccupancyStatus.ACTIVE)) {
            throw new BusinessException("Release the resident's flat occupancy before deactivation");
        }
        user.setActive(false);
        user.setFlatId(null);
        return map(users.save(user));
    }

    private AppUser requireResident(UUID id) {
        AppUser user = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("Resident not found"));
        if (user.getRole() != Role.RESIDENT) {
            throw new InvalidRequestException("User is not a resident");
        }
        return user;
    }

    private ResidentResponse map(AppUser user) {
        String apartmentName = null;
        if (user.getApartmentId() != null) {
            apartmentName = apartments.findById(user.getApartmentId()).map(Apartment::getName).orElse(null);
        }
        String flatNumber = null;
        if (user.getFlatId() != null) {
            flatNumber = flats.findById(user.getFlatId()).map(Flat::getFlatNumber).orElse(null);
        }
        return new ResidentResponse(
                user.getId(), user.getEmail(), user.getFullName(),
                user.getApartmentId(), apartmentName,
                user.getFlatId(), flatNumber,
                user.isActive(), user.getCreatedAt()
        );
    }
}
