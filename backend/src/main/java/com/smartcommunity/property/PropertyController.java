package com.smartcommunity.property;

import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.property.PropertyDtos.*;

@RestController
@RequestMapping("/api/v1")
public class PropertyController {
    private final PropertyService service;

    public PropertyController(PropertyService service) {
        this.service = service;
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/apartments")
    public ResponseEntity<ApartmentResponse> createApartment(@Valid @RequestBody ApartmentRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createApartment(r));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/apartments/{id}")
    public ApartmentResponse updateApartment(@PathVariable UUID id,
                                             @Valid @RequestBody ApartmentUpdateRequest r,
                                             @AuthenticationPrincipal UserPrincipal principal) {
        return service.updateApartment(id, r, principal);
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/apartments/{id}/archive")
    public ApartmentResponse archiveApartment(@PathVariable UUID id,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        return service.archiveApartment(id, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @GetMapping("/apartments")
    public List<ApartmentResponse> apartments(@AuthenticationPrincipal UserPrincipal principal) {
        return service.apartments(principal);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/blocks")
    public ResponseEntity<BlockResponse> createBlock(@Valid @RequestBody BlockRequest r,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(service.createBlock(r, principal));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/blocks/{id}")
    public BlockResponse updateBlock(@PathVariable UUID id,
                                     @Valid @RequestBody BlockUpdateRequest r,
                                     @AuthenticationPrincipal UserPrincipal principal) {
        return service.updateBlock(id, r, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @GetMapping("/apartments/{id}/blocks")
    public List<BlockResponse> blocks(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        return service.blocks(id, principal);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/floors")
    public ResponseEntity<FloorResponse> createFloor(@Valid @RequestBody FloorRequest r,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(service.createFloor(r, principal));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/floors/{id}")
    public FloorResponse updateFloor(@PathVariable UUID id,
                                     @Valid @RequestBody FloorUpdateRequest r,
                                     @AuthenticationPrincipal UserPrincipal principal) {
        return service.updateFloor(id, r, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @GetMapping("/blocks/{id}/floors")
    public List<FloorResponse> floors(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        return service.floors(id, principal);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/flats")
    public ResponseEntity<FlatResponse> createFlat(@Valid @RequestBody FlatRequest r,
                                                   @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(service.createFlat(r, principal));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/flats/{id}")
    public FlatResponse updateFlat(@PathVariable UUID id,
                                   @Valid @RequestBody FlatUpdateRequest r,
                                   @AuthenticationPrincipal UserPrincipal principal) {
        return service.updateFlat(id, r, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @GetMapping("/floors/{id}/flats")
    public List<FlatResponse> flats(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        return service.flats(id, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @GetMapping("/flats")
    public List<FlatResponse> societyFlats(@RequestParam(required = false) UUID apartmentId,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return service.societyFlats(principal, apartmentId);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/flats/{id}/status")
    public FlatResponse updateFlatStatus(@PathVariable UUID id,
                                         @Valid @RequestBody FlatStatusRequest r,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        return service.updateFlatStatus(id, r, principal);
    }
}
