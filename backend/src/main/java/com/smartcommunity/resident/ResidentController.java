package com.smartcommunity.resident;

import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.resident.ResidentDtos.*;

@RestController
@RequestMapping("/api/v1/residents")
public class ResidentController {
    private final ResidentService service;

    public ResidentController(ResidentService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN')")
    @PostMapping
    public ResponseEntity<ResidentResponse> register(@Valid @RequestBody RegisterRequest request,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.register(request, principal));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN','STAFF','RESIDENT')")
    @GetMapping
    public List<ResidentResponse> list(@RequestParam(required = false) UUID apartmentId,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        return service.list(apartmentId, principal);
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN','STAFF','RESIDENT')")
    @GetMapping("/{id}")
    public ResidentResponse get(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        return service.get(id, principal);
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN')")
    @PutMapping("/{id}")
    public ResidentResponse update(@PathVariable UUID id,
                                   @Valid @RequestBody UpdateRequest request,
                                   @AuthenticationPrincipal UserPrincipal principal) {
        return service.update(id, request, principal);
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN')")
    @PostMapping("/{id}/deactivate")
    public ResidentResponse deactivate(@PathVariable UUID id,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        return service.deactivate(id, principal);
    }
}
