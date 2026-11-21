package com.smartcommunity.parking;

import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.smartcommunity.parking.ParkingDtos.*;

@RestController
@RequestMapping("/api/v1/parking-slots")
public class ParkingController {
    private final ParkingService service;

    public ParkingController(ParkingService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @GetMapping
    public Object all(@RequestParam(required = false) UUID apartmentId,
                      @RequestParam(required = false) Integer page,
                      @RequestParam(required = false) Integer size,
                      @AuthenticationPrincipal UserPrincipal principal) {
        if (page != null) {
            return service.page(principal, apartmentId, page, size == null ? 20 : size);
        }
        return service.all(principal, apartmentId);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<Response> create(@Valid @RequestBody CreateRequest r,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(service.create(r, principal));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public Response update(@PathVariable UUID id,
                           @Valid @RequestBody UpdateRequest r,
                           @AuthenticationPrincipal UserPrincipal principal) {
        return service.update(id, r, principal);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/allocate")
    public Response allocate(@PathVariable UUID id,
                             @Valid @RequestBody AllocateRequest r,
                             @AuthenticationPrincipal UserPrincipal principal) {
        return service.allocate(id, r, principal);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/release")
    public Response release(@PathVariable UUID id,
                            @AuthenticationPrincipal UserPrincipal principal) {
        return service.release(id, principal);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/deactivate")
    public Response deactivate(@PathVariable UUID id,
                               @AuthenticationPrincipal UserPrincipal principal) {
        return service.deactivate(id, principal);
    }
}
