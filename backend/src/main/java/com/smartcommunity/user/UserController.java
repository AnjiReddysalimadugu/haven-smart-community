package com.smartcommunity.user;

import com.smartcommunity.auth.Role;
import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.user.UserDtos.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    /** STAFF needs read access for complaint assignee pickers; mutations stay admin-only. */
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN','STAFF')")
    @GetMapping
    public List<UserResponse> list(@RequestParam(required = false) UUID apartmentId,
                                   @RequestParam(required = false) Role role,
                                   @AuthenticationPrincipal UserPrincipal principal) {
        return service.list(apartmentId, role, principal);
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN')")
    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request, principal));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN')")
    @PutMapping("/{id}")
    public UserResponse update(@PathVariable UUID id,
                               @Valid @RequestBody UpdateUserRequest request,
                               @AuthenticationPrincipal UserPrincipal principal) {
        return service.update(id, request, principal);
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN')")
    @PostMapping("/{id}/deactivate")
    public UserResponse deactivate(@PathVariable UUID id,
                                   @AuthenticationPrincipal UserPrincipal principal) {
        return service.deactivate(id, principal);
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APARTMENT_ADMIN','ADMIN')")
    @PostMapping("/{id}/activate")
    public UserResponse activate(@PathVariable UUID id,
                                 @AuthenticationPrincipal UserPrincipal principal) {
        return service.activate(id, principal);
    }
}
