package com.smartcommunity.property;

import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.AppUser;
import com.smartcommunity.auth.AppUserRepository;
import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.common.BusinessException;
import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.common.ResourceNotFoundException;
import com.smartcommunity.parking.ParkingRepository;
import com.smartcommunity.parking.ParkingSlot;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.smartcommunity.property.OccupancyDtos.*;

@Service
@Transactional
public class OccupancyService {
    private final FlatOccupancyRepository occupancies;
    private final FlatRepository flats;
    private final AppUserRepository users;
    private final ParkingRepository parking;
    private final AccessGuard accessGuard;

    public OccupancyService(FlatOccupancyRepository occupancies, FlatRepository flats,
                            AppUserRepository users, ParkingRepository parking, AccessGuard accessGuard) {
        this.occupancies = occupancies;
        this.flats = flats;
        this.users = users;
        this.parking = parking;
        this.accessGuard = accessGuard;
    }

    public OccupancyResponse allocate(UUID flatId, AllocateRequest request, UserPrincipal actor) {
        Flat flat = accessGuard.requireAccessibleFlat(actor, flatId);
        if (!accessGuard.isSocietyAdmin(actor)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only society administrators can allocate occupancy");
        }

        if (occupancies.existsByFlatIdAndStatus(flatId, OccupancyStatus.ACTIVE)) {
            throw new BusinessException("Flat already has an active occupancy assignment");
        }

        AppUser resident = users.findById(request.residentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Resident not found"));
        if (resident.getRole() != Role.RESIDENT) {
            throw new InvalidRequestException("Only RESIDENT users can be allocated to a flat");
        }
        if (!resident.isActive()) {
            throw new InvalidRequestException("Cannot allocate a deactivated resident");
        }

        UUID apartmentId = flat.getFloor().getBlock().getApartment().getId();
        if (resident.getApartmentId() == null || !resident.getApartmentId().equals(apartmentId)) {
            throw new InvalidRequestException("Resident does not belong to this apartment");
        }
        if (occupancies.existsByResidentUserIdAndStatus(resident.getId(), OccupancyStatus.ACTIVE)) {
            throw new BusinessException("Resident already has an active flat assignment");
        }

        FlatOccupancy occupancy = occupancies.save(new FlatOccupancy(
                flatId, request.residentUserId(), request.occupancyType(), actor.getId(), request.notes()));

        resident.setFlatId(flatId);
        users.save(resident);

        flat.setStatus(request.occupancyType() == OccupancyType.TENANT
                ? FlatStatus.TENANT_OCCUPIED
                : FlatStatus.OWNER_OCCUPIED);
        flats.save(flat);

        return map(occupancy, flat, resident);
    }

    public OccupancyResponse release(UUID flatId, UserPrincipal actor) {
        Flat flat = accessGuard.requireAccessibleFlat(actor, flatId);
        // Admins release any society flat; residents may only release their own (AccessGuard).
        if (!accessGuard.isSocietyAdmin(actor) && actor.getRole() != Role.RESIDENT) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only society administrators or the resident can release occupancy");
        }

        FlatOccupancy occupancy = occupancies.findByFlatIdAndStatus(flatId, OccupancyStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active occupancy for this flat"));

        occupancy.end(Instant.now());
        occupancies.save(occupancy);

        AppUser resident = users.findById(occupancy.getResidentUserId()).orElse(null);
        if (resident != null && flatId.equals(resident.getFlatId())) {
            resident.setFlatId(null);
            users.save(resident);
        }

        // Free parking tied to this flat so inventory stays consistent after move-out.
        for (ParkingSlot slot : parking.findByFlat_Id(flatId)) {
            if (slot.isAllocated()) {
                slot.release();
                parking.save(slot);
            }
        }

        flat.setStatus(FlatStatus.AVAILABLE);
        flats.save(flat);

        return map(occupancy, flat, resident);
    }

    @Transactional(readOnly = true)
    public OccupancyResponse current(UUID flatId, UserPrincipal actor) {
        Flat flat = accessGuard.requireAccessibleFlat(actor, flatId);
        FlatOccupancy occupancy = occupancies.findByFlatIdAndStatus(flatId, OccupancyStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active occupancy for this flat"));
        AppUser resident = users.findById(occupancy.getResidentUserId()).orElse(null);
        return map(occupancy, flat, resident);
    }

    @Transactional(readOnly = true)
    public List<OccupancyResponse> history(UUID flatId, UserPrincipal actor) {
        Flat flat = accessGuard.requireAccessibleFlat(actor, flatId);
        return occupancies.findByFlatIdOrderByStartedAtDesc(flatId).stream()
                .map(o -> {
                    AppUser resident = users.findById(o.getResidentUserId()).orElse(null);
                    return map(o, flat, resident);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OccupancyResponse> listForApartment(UUID apartmentId, UserPrincipal actor) {
        List<FlatOccupancy> rows;
        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null) {
                return List.of();
            }
            rows = occupancies.findByFlatIdOrderByStartedAtDesc(actor.getFlatId());
        } else if (accessGuard.isSuperAdmin(actor)) {
            if (apartmentId == null) {
                rows = occupancies.findAllByOrderByStartedAtDesc();
            } else {
                accessGuard.requireApartmentAccess(actor, apartmentId);
                rows = occupancies.findByApartmentIdOrderByStartedAtDesc(apartmentId);
            }
        } else {
            UUID scope = accessGuard.resolveApartmentScope(actor, apartmentId);
            accessGuard.requireApartmentAccess(actor, scope);
            rows = occupancies.findByApartmentIdOrderByStartedAtDesc(scope);
        }
        return rows.stream()
                .map(o -> {
                    Flat flat = flats.findById(o.getFlatId()).orElse(null);
                    AppUser resident = users.findById(o.getResidentUserId()).orElse(null);
                    return map(o, flat, resident);
                })
                .toList();
    }

    private OccupancyResponse map(FlatOccupancy o, Flat flat, AppUser resident) {
        return new OccupancyResponse(
                o.getId(),
                o.getFlatId(),
                flat != null ? flat.getFlatNumber() : null,
                o.getResidentUserId(),
                resident != null ? resident.getFullName() : null,
                resident != null ? resident.getEmail() : null,
                o.getOccupancyType(),
                o.getStatus(),
                o.getStartedAt(),
                o.getEndedAt(),
                o.getNotes()
        );
    }
}
