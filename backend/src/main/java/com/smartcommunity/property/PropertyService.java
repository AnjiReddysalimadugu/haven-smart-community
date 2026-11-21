package com.smartcommunity.property;

import com.smartcommunity.audit.AuditService;
import com.smartcommunity.auth.AccessGuard;
import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import com.smartcommunity.common.ResourceNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.property.PropertyDtos.*;

@Service
@Transactional
public class PropertyService {
    private final ApartmentRepository apartments;
    private final BlockRepository blocks;
    private final FloorRepository floors;
    private final FlatRepository flats;
    private final AccessGuard accessGuard;
    private final AuditService audit;

    public PropertyService(ApartmentRepository apartments, BlockRepository blocks,
                           FloorRepository floors, FlatRepository flats, AccessGuard accessGuard,
                           AuditService audit) {
        this.apartments = apartments;
        this.blocks = blocks;
        this.floors = floors;
        this.flats = flats;
        this.accessGuard = accessGuard;
        this.audit = audit;
    }

    public ApartmentResponse createApartment(ApartmentRequest r) {
        Apartment saved = apartments.save(new Apartment(r.name(), r.address(), r.timezone()));
        audit.record(currentActor(), "APARTMENT_CREATE", "APARTMENT", saved.getId(),
                "Created society " + saved.getName(), saved.getId());
        return map(saved);
    }

    public ApartmentResponse updateApartment(UUID id, ApartmentUpdateRequest r, UserPrincipal actor) {
        Apartment apartment = requireApartment(id, actor);
        if (!accessGuard.isSocietyAdmin(actor) && !accessGuard.isSuperAdmin(actor)) {
            throw new org.springframework.security.access.AccessDeniedException("Only administrators can update society profile");
        }
        apartment.update(r.name(), r.address(), r.timezone());
        Apartment saved = apartments.save(apartment);
        audit.record(actor, "APARTMENT_UPDATE", "APARTMENT", saved.getId(),
                "Updated society " + saved.getName(), saved.getId());
        return map(saved);
    }

    public ApartmentResponse archiveApartment(UUID id, UserPrincipal actor) {
        if (!accessGuard.isSuperAdmin(actor)) {
            throw new org.springframework.security.access.AccessDeniedException("Only platform super admins can archive a society");
        }
        Apartment apartment = apartments.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found"));
        apartment.setStatus("ARCHIVED");
        Apartment saved = apartments.save(apartment);
        audit.record(actor, "APARTMENT_ARCHIVE", "APARTMENT", saved.getId(),
                "Archived society " + saved.getName(), saved.getId());
        return map(saved);
    }

    private UserPrincipal currentActor() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal p) return p;
        return null;
    }

    public FlatResponse updateFlatStatus(UUID flatId, FlatStatusRequest r, UserPrincipal actor) {
        Flat flat = accessGuard.requireAccessibleFlat(actor, flatId);
        if (!accessGuard.isSocietyAdmin(actor)) {
            throw new org.springframework.security.access.AccessDeniedException("Only society administrators can change flat status");
        }
        if (r.status() == FlatStatus.OWNER_OCCUPIED || r.status() == FlatStatus.TENANT_OCCUPIED) {
            throw new com.smartcommunity.common.InvalidRequestException(
                    "Use occupancy allocate to mark a flat as occupied");
        }
        flat.setStatus(r.status());
        return map(flats.save(flat));
    }

    @Transactional(readOnly = true)
    public List<ApartmentResponse> apartments(UserPrincipal actor) {
        if (accessGuard.isSuperAdmin(actor)) {
            return apartments.findAll().stream().map(this::map).toList();
        }
        if (actor.getApartmentId() != null) {
            return apartments.findById(actor.getApartmentId()).stream().map(this::map).toList();
        }
        return List.of();
    }

    public BlockResponse createBlock(BlockRequest r, UserPrincipal actor) {
        Apartment apartment = requireApartment(r.apartmentId(), actor);
        Block block = blocks.save(new Block(apartment, r.name(), r.code()));
        return new BlockResponse(block.getId(), apartment.getId(), block.getName(), block.getCode());
    }

    public BlockResponse updateBlock(UUID id, BlockUpdateRequest r, UserPrincipal actor) {
        Block block = blocks.findById(id).orElseThrow(() -> new ResourceNotFoundException("Block not found"));
        requireApartment(block.getApartment().getId(), actor);
        block.update(r.name().trim(), r.code().trim().toUpperCase());
        Block saved = blocks.save(block);
        audit.record(actor, "BLOCK_UPDATE", "BLOCK", saved.getId(),
                "Updated block " + saved.getName(), saved.getApartment().getId());
        return new BlockResponse(saved.getId(), saved.getApartment().getId(), saved.getName(), saved.getCode());
    }

    @Transactional(readOnly = true)
    public List<BlockResponse> blocks(UUID apartmentId, UserPrincipal actor) {
        requireApartment(apartmentId, actor);
        return blocks.findByApartmentIdOrderByCode(apartmentId).stream()
                .map(b -> new BlockResponse(b.getId(), b.getApartment().getId(), b.getName(), b.getCode()))
                .toList();
    }

    public FloorResponse createFloor(FloorRequest r, UserPrincipal actor) {
        Block block = blocks.findById(r.blockId()).orElseThrow(() -> new ResourceNotFoundException("Block not found"));
        requireApartment(block.getApartment().getId(), actor);
        Floor floor = floors.save(new Floor(block, r.floorNumber(), r.name()));
        return new FloorResponse(floor.getId(), block.getId(), floor.getFloorNumber(), floor.getName());
    }

    public FloorResponse updateFloor(UUID id, FloorUpdateRequest r, UserPrincipal actor) {
        Floor floor = floors.findById(id).orElseThrow(() -> new ResourceNotFoundException("Floor not found"));
        requireApartment(floor.getBlock().getApartment().getId(), actor);
        floor.update(r.floorNumber(), r.name().trim());
        Floor saved = floors.save(floor);
        audit.record(actor, "FLOOR_UPDATE", "FLOOR", saved.getId(),
                "Updated floor " + saved.getName(), floor.getBlock().getApartment().getId());
        return new FloorResponse(saved.getId(), saved.getBlock().getId(), saved.getFloorNumber(), saved.getName());
    }

    @Transactional(readOnly = true)
    public List<FloorResponse> floors(UUID blockId, UserPrincipal actor) {
        Block block = blocks.findById(blockId).orElseThrow(() -> new ResourceNotFoundException("Block not found"));
        requireApartment(block.getApartment().getId(), actor);
        return floors.findByBlockIdOrderByFloorNumber(blockId).stream()
                .map(f -> new FloorResponse(f.getId(), f.getBlock().getId(), f.getFloorNumber(), f.getName()))
                .toList();
    }

    public FlatResponse createFlat(FlatRequest r, UserPrincipal actor) {
        Floor floor = floors.findById(r.floorId()).orElseThrow(() -> new ResourceNotFoundException("Floor not found"));
        requireApartment(floor.getBlock().getApartment().getId(), actor);
        return map(flats.save(new Flat(floor, r.flatNumber(), r.areaSqft(), r.bedroomCount())));
    }

    public FlatResponse updateFlat(UUID id, FlatUpdateRequest r, UserPrincipal actor) {
        Flat flat = accessGuard.requireAccessibleFlat(actor, id);
        if (!accessGuard.isSocietyAdmin(actor)) {
            throw new org.springframework.security.access.AccessDeniedException("Only administrators can edit flats");
        }
        flat.update(r.flatNumber().trim(), r.areaSqft(), r.bedroomCount());
        Flat saved = flats.save(flat);
        audit.record(actor, "FLAT_UPDATE", "FLAT", saved.getId(),
                "Updated flat " + saved.getFlatNumber(),
                saved.getFloor().getBlock().getApartment().getId());
        return map(saved);
    }

    @Transactional(readOnly = true)
    public List<FlatResponse> flats(UUID floorId, UserPrincipal actor) {
        Floor floor = floors.findById(floorId).orElseThrow(() -> new ResourceNotFoundException("Floor not found"));
        requireApartment(floor.getBlock().getApartment().getId(), actor);
        if (actor.getRole() == Role.RESIDENT && actor.getFlatId() != null) {
            return flats.findByFloorIdOrderByFlatNumber(floorId).stream()
                    .filter(f -> f.getId().equals(actor.getFlatId()))
                    .map(this::map)
                    .toList();
        }
        return flats.findByFloorIdOrderByFlatNumber(floorId).stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public List<FlatResponse> societyFlats(UserPrincipal actor, UUID apartmentId) {
        if (actor.getRole() == Role.RESIDENT) {
            if (actor.getFlatId() == null) return List.of();
            return flats.findById(actor.getFlatId()).stream().map(this::map).toList();
        }
        if (accessGuard.isSuperAdmin(actor)) {
            if (apartmentId != null) {
                accessGuard.requireApartmentAccess(actor, apartmentId);
                return flats.findByApartmentIdOrderByFlatNumber(apartmentId).stream().map(this::map).toList();
            }
            return flats.findAll().stream().map(this::map).toList();
        }
        if (actor.getApartmentId() != null) {
            return flats.findByApartmentIdOrderByFlatNumber(actor.getApartmentId()).stream().map(this::map).toList();
        }
        return List.of();
    }

    private Apartment requireApartment(UUID apartmentId, UserPrincipal actor) {
        Apartment apartment = apartments.findById(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found"));
        accessGuard.requireApartmentAccess(actor, apartmentId);
        return apartment;
    }

    private ApartmentResponse map(Apartment a) {
        return new ApartmentResponse(a.getId(), a.getName(), a.getAddress(), a.getTimezone(), a.getStatus());
    }

    private FlatResponse map(Flat f) {
        return new FlatResponse(f.getId(), f.getFloor().getId(), f.getFlatNumber(), f.getAreaSqft(),
                f.getBedroomCount(), f.getStatus());
    }
}
