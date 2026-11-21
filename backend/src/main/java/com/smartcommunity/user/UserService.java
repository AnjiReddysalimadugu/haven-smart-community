package com.smartcommunity.user;

import com.smartcommunity.audit.AuditService;
import com.smartcommunity.auth.*;
import com.smartcommunity.common.BusinessException;
import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.common.ResourceNotFoundException;
import com.smartcommunity.property.Apartment;
import com.smartcommunity.property.ApartmentRepository;
import com.smartcommunity.property.Flat;
import com.smartcommunity.property.FlatOccupancyRepository;
import com.smartcommunity.property.FlatRepository;
import com.smartcommunity.property.OccupancyStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static com.smartcommunity.user.UserDtos.*;

@Service
@Transactional
public class UserService {
    private final AppUserRepository users;
    private final ApartmentRepository apartments;
    private final FlatRepository flats;
    private final FlatOccupancyRepository occupancies;
    private final AccessGuard accessGuard;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;

    public UserService(AppUserRepository users, ApartmentRepository apartments, FlatRepository flats,
                       FlatOccupancyRepository occupancies, AccessGuard accessGuard,
                       PasswordEncoder passwordEncoder, AuditService audit) {
        this.users = users;
        this.apartments = apartments;
        this.flats = flats;
        this.audit = audit;
        this.occupancies = occupancies;
        this.accessGuard = accessGuard;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list(UUID apartmentId, Role role, UserPrincipal actor) {
        // STAFF may list society users (complaint assignees); create/update stay admin-only.
        if (!accessGuard.isSocietyAdmin(actor) && actor.getRole() != Role.STAFF) {
            throw new AccessDeniedException("Only society staff and administrators can list users");
        }
        UUID scope = resolveListScope(actor, apartmentId);
        Stream<AppUser> stream;
        if (accessGuard.isSuperAdmin(actor) && scope == null) {
            stream = users.findAllByOrderByFullNameAsc().stream();
        } else {
            accessGuard.requireApartmentAccess(actor, scope);
            stream = users.findByApartmentIdOrderByFullNameAsc(scope).stream();
        }
        if (!accessGuard.isSuperAdmin(actor)) {
            stream = stream.filter(u -> u.getRole() != Role.SUPER_ADMIN);
        }
        if (role != null) {
            Role wanted = role == Role.ADMIN ? Role.APARTMENT_ADMIN : role;
            stream = stream.filter(u -> normalizeRole(u.getRole()) == wanted);
        }
        return stream.map(this::map).toList();
    }

    public UserResponse create(CreateUserRequest request, UserPrincipal actor) {
        requireUserManager(actor);
        Role requested = request.role();
        if (requested == null) {
            throw new InvalidRequestException("Role is required");
        }
        Role role = requested == Role.ADMIN ? Role.APARTMENT_ADMIN : requested;
        validateCreatableRole(actor, role);

        UUID apartmentId = null;
        if (role == Role.SUPER_ADMIN) {
            if (request.apartmentId() != null) {
                throw new InvalidRequestException("Platform super admins are not linked to an apartment");
            }
        } else {
            apartmentId = accessGuard.resolveApartmentScope(actor, request.apartmentId());
            apartments.findById(apartmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Apartment not found"));
            accessGuard.requireApartmentAccess(actor, apartmentId);
        }

        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("A user with this email already exists");
        }

        AppUser user = new AppUser(
                email,
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                role
        );
        user.setApartmentId(apartmentId);
        user.setActive(true);
        return map(users.save(user));
    }

    public UserResponse update(UUID id, UpdateUserRequest request, UserPrincipal actor) {
        requireUserManager(actor);
        AppUser user = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        requireManageTarget(actor, user);

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

    public UserResponse deactivate(UUID id, UserPrincipal actor) {
        requireUserManager(actor);
        AppUser user = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getId().equals(actor.getId())) {
            throw new InvalidRequestException("You cannot deactivate your own account");
        }
        requireManageTarget(actor, user);
        if (user.getRole() == Role.RESIDENT
                && occupancies.existsByResidentUserIdAndStatus(user.getId(), OccupancyStatus.ACTIVE)) {
            throw new BusinessException("Release the resident's flat occupancy before deactivation");
        }
        user.setActive(false);
        if (user.getRole() == Role.RESIDENT) {
            user.setFlatId(null);
        }
        AppUser saved = users.save(user);
        audit.record(actor, "USER_DEACTIVATE", "USER", saved.getId(),
                "Deactivated " + saved.getFullName() + " (" + saved.getRole() + ")", saved.getApartmentId());
        return map(saved);
    }

    public UserResponse activate(UUID id, UserPrincipal actor) {
        requireUserManager(actor);
        AppUser user = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        requireManageTarget(actor, user);
        user.setActive(true);
        AppUser saved = users.save(user);
        audit.record(actor, "USER_ACTIVATE", "USER", saved.getId(),
                "Activated " + saved.getFullName() + " (" + saved.getRole() + ")", saved.getApartmentId());
        return map(saved);
    }

    private void requireUserManager(UserPrincipal actor) {
        if (!accessGuard.isSocietyAdmin(actor)) {
            throw new AccessDeniedException("Only society administrators can manage users");
        }
    }

    private void validateCreatableRole(UserPrincipal actor, Role role) {
        if (accessGuard.isSuperAdmin(actor)) {
            return;
        }
        if (role == Role.STAFF || role == Role.SECURITY || role == Role.RESIDENT) {
            return;
        }
        throw new AccessDeniedException("You can only create Staff, Security or Resident users for your society");
    }

    private UUID resolveListScope(UserPrincipal actor, UUID apartmentId) {
        if (accessGuard.isSuperAdmin(actor)) {
            return apartmentId;
        }
        return accessGuard.resolveApartmentScope(actor, apartmentId);
    }

    private void requireManageTarget(UserPrincipal actor, AppUser user) {
        if (user.getRole() == Role.SUPER_ADMIN && !accessGuard.isSuperAdmin(actor)) {
            throw new AccessDeniedException("You cannot manage platform super admins");
        }
        if (user.getApartmentId() == null) {
            if (!accessGuard.isSuperAdmin(actor)) {
                throw new AccessDeniedException("User is outside your society");
            }
            return;
        }
        accessGuard.requireApartmentAccess(actor, user.getApartmentId());
        if (!accessGuard.isSuperAdmin(actor)
                && (user.getRole() == Role.APARTMENT_ADMIN || user.getRole() == Role.ADMIN)) {
            throw new AccessDeniedException("Only a platform super admin can manage society administrators");
        }
    }

    private static Role normalizeRole(Role role) {
        return role == Role.ADMIN ? Role.APARTMENT_ADMIN : role;
    }

    private UserResponse map(AppUser user) {
        String apartmentName = null;
        if (user.getApartmentId() != null) {
            apartmentName = apartments.findById(user.getApartmentId()).map(Apartment::getName).orElse(null);
        }
        String flatNumber = null;
        if (user.getFlatId() != null) {
            flatNumber = flats.findById(user.getFlatId()).map(Flat::getFlatNumber).orElse(null);
        }
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getApartmentId(),
                apartmentName,
                user.getFlatId(),
                flatNumber,
                user.isActive(),
                user.getCreatedAt()
        );
    }
}
