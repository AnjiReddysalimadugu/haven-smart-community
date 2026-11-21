package com.smartcommunity.family;

import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.family.FamilyDtos.*;

@RestController
@RequestMapping("/api/v1/family-members")
public class FamilyController {
    private final FamilyService service;

    public FamilyController(FamilyService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('ADMIN','RESIDENT')")
    @GetMapping
    public List<Response> list(@RequestParam(required = false) UUID apartmentId,
                               @RequestParam(required = false) UUID flatId,
                               @AuthenticationPrincipal UserPrincipal principal) {
        return service.list(principal, apartmentId, flatId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','RESIDENT')")
    @PostMapping
    public ResponseEntity<Response> create(@Valid @RequestBody CreateRequest r,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(service.create(r, principal));
    }

    @PreAuthorize("hasAnyRole('ADMIN','RESIDENT')")
    @PutMapping("/{id}")
    public Response update(@PathVariable UUID id, @Valid @RequestBody UpdateRequest r,
                           @AuthenticationPrincipal UserPrincipal principal) {
        return service.update(id, r, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','RESIDENT')")
    @PostMapping("/{id}/deactivate")
    public Response deactivate(@PathVariable UUID id,
                               @AuthenticationPrincipal UserPrincipal principal) {
        return service.deactivate(id, principal);
    }
}
