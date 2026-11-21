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

import static com.smartcommunity.property.OccupancyDtos.*;

@RestController
@RequestMapping("/api/v1")
public class OccupancyController {
    private final OccupancyService service;

    public OccupancyController(OccupancyService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN','STAFF','RESIDENT')")
    @GetMapping("/occupancies")
    public List<OccupancyResponse> list(@RequestParam(required = false) UUID apartmentId,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return service.listForApartment(apartmentId, principal);
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN','STAFF','RESIDENT')")
    @GetMapping("/flats/{flatId}/occupancy")
    public OccupancyResponse current(@PathVariable UUID flatId,
                                     @AuthenticationPrincipal UserPrincipal principal) {
        return service.current(flatId, principal);
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN','STAFF')")
    @GetMapping("/flats/{flatId}/occupancy/history")
    public List<OccupancyResponse> history(@PathVariable UUID flatId,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return service.history(flatId, principal);
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN')")
    @PostMapping("/flats/{flatId}/occupancy")
    public ResponseEntity<OccupancyResponse> allocate(@PathVariable UUID flatId,
                                                      @Valid @RequestBody AllocateRequest request,
                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.allocate(flatId, request, principal));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN','RESIDENT')")
    @PostMapping("/flats/{flatId}/occupancy/release")
    public OccupancyResponse release(@PathVariable UUID flatId,
                                     @AuthenticationPrincipal UserPrincipal principal) {
        return service.release(flatId, principal);
    }
}
