package com.smartcommunity.parking;

import com.smartcommunity.audit.AuditService;
import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.common.BusinessException;
import com.smartcommunity.common.InvalidRequestException;
import com.smartcommunity.common.PageResponse;
import com.smartcommunity.common.ResourceNotFoundException;
import com.smartcommunity.property.Apartment;
import com.smartcommunity.property.ApartmentRepository;
import com.smartcommunity.property.Flat;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.parking.ParkingDtos.*;

@Service
@Transactional
public class ParkingService {
    private final ParkingRepository repo;
    private final ApartmentRepository apartments;
    private final AccessGuard accessGuard;
    private final AuditService audit;

    public ParkingService(ParkingRepository repo, ApartmentRepository apartments,
                          AccessGuard accessGuard, AuditService audit) {
        this.repo = repo;
        this.apartments = apartments;
        this.accessGuard = accessGuard;
        this.audit = audit;
    }

    public Response create(CreateRequest r, UserPrincipal actor) {
        UUID apartmentId = accessGuard.resolveApartmentScope(actor, r.apartmentId());
        Apartment apartment = apartments.findById(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found"));
        accessGuard.requireApartmentAccess(actor, apartment.getId());
        ParkingSlot saved = repo.save(new ParkingSlot(apartment, r.slotCode(), r.vehicleType().toUpperCase(), r.monthlyCharge()));
        audit.record(actor, "PARKING_CREATE", "PARKING_SLOT", saved.getId(),
                "Created slot " + saved.getSlotCode(), apartmentId);
        return map(saved);
    }

    public Response update(UUID id, UpdateRequest r, UserPrincipal actor) {
        ParkingSlot slot = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Parking slot not found"));
        accessGuard.requireApartmentAccess(actor, slot.getApartmentId());
        if (!slot.isActive()) {
            throw new InvalidRequestException("Cannot edit an inactive parking slot");
        }
        slot.update(r.slotCode(), r.vehicleType(), r.monthlyCharge());
        audit.record(actor, "PARKING_UPDATE", "PARKING_SLOT", slot.getId(),
                "Updated slot " + slot.getSlotCode(), slot.getApartmentId());
        return map(slot);
    }

    public Response deactivate(UUID id, UserPrincipal actor) {
        ParkingSlot slot = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Parking slot not found"));
        accessGuard.requireApartmentAccess(actor, slot.getApartmentId());
        slot.deactivate();
        audit.record(actor, "PARKING_DEACTIVATE", "PARKING_SLOT", slot.getId(),
                "Deactivated slot " + slot.getSlotCode(), slot.getApartmentId());
        return map(slot);
    }

    public Response allocate(UUID id, AllocateRequest r, UserPrincipal actor) {
        ParkingSlot slot = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Parking slot not found"));
        accessGuard.requireApartmentAccess(actor, slot.getApartmentId());
        Flat flat = accessGuard.requireAccessibleFlat(actor, r.flatId());
        UUID flatApartmentId = flat.getFloor().getBlock().getApartment().getId();
        if (!flatApartmentId.equals(slot.getApartmentId())) {
            throw new InvalidRequestException("Flat belongs to a different society");
        }
        String vehicle = r.vehicleNumber() == null || r.vehicleNumber().isBlank()
                ? null : r.vehicleNumber().trim().toUpperCase();
        if (vehicle != null && repo.existsActiveVehicle(slot.getApartmentId(), vehicle)) {
            throw new BusinessException("Vehicle " + vehicle + " already has an active parking allocation");
        }
        slot.allocate(flat, vehicle);
        audit.record(actor, "PARKING_ALLOCATE", "PARKING_SLOT", slot.getId(),
                "Allocated " + slot.getSlotCode() + " to " + flat.getFlatNumber(), slot.getApartmentId());
        return map(slot);
    }

    public Response release(UUID id, UserPrincipal actor) {
        ParkingSlot slot = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Parking slot not found"));
        accessGuard.requireApartmentAccess(actor, slot.getApartmentId());
        String code = slot.getSlotCode();
        slot.release();
        audit.record(actor, "PARKING_RELEASE", "PARKING_SLOT", slot.getId(),
                "Released slot " + code, slot.getApartmentId());
        return map(slot);
    }

    @Transactional(readOnly = true)
    public List<Response> all(UserPrincipal actor, UUID apartmentId) {
        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null) return List.of();
            return repo.findByFlat_Id(actor.getFlatId()).stream().map(this::map).toList();
        }
        if (accessGuard.isSuperAdmin(actor)) {
            if (apartmentId != null) {
                return repo.findByApartment_IdOrderBySlotCode(apartmentId).stream().map(this::map).toList();
            }
            return repo.findAllByOrderBySlotCode().stream().map(this::map).toList();
        }
        if (actor.getApartmentId() != null) {
            return repo.findByApartment_IdOrderBySlotCode(actor.getApartmentId()).stream().map(this::map).toList();
        }
        throw new InvalidRequestException("Apartment scope is required");
    }

    @Transactional(readOnly = true)
    public PageResponse<Response> page(UserPrincipal actor, UUID apartmentId, int page, int size) {
        return PageResponse.of(all(actor, apartmentId), page, size);
    }

    private Response map(ParkingSlot p) {
        Flat flat = p.getFlat();
        return new Response(
                p.getId(),
                p.getApartmentId(),
                p.getSlotCode(),
                p.getVehicleType(),
                p.getMonthlyCharge(),
                p.isActive(),
                flat == null ? null : flat.getId(),
                flat == null ? null : flat.getFlatNumber(),
                p.getVehicleNumber(),
                p.getAllocatedAt(),
                p.isAllocated()
        );
    }
}
