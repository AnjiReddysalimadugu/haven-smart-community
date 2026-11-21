package com.smartcommunity.notice;

import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.smartcommunity.notice.NoticeDtos.*;

@RestController
@RequestMapping("/api/v1/notices")
public class NoticeController {
    private final NoticeService service;

    public NoticeController(NoticeService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','SECURITY','RESIDENT')")
    @GetMapping
    public List<Response> list(@RequestParam(required = false) UUID apartmentId,
                               @AuthenticationPrincipal UserPrincipal principal) {
        return service.list(principal, apartmentId);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<Response> create(@Valid @RequestBody CreateRequest r,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(service.create(r, principal));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public Response update(@PathVariable UUID id, @Valid @RequestBody UpdateRequest r,
                           @AuthenticationPrincipal UserPrincipal principal) {
        return service.update(id, r, principal);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/deactivate")
    public Response deactivate(@PathVariable UUID id,
                               @AuthenticationPrincipal UserPrincipal principal) {
        return service.deactivate(id, principal);
    }
}
