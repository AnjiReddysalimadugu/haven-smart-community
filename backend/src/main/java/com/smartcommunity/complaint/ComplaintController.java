package com.smartcommunity.complaint;

import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.smartcommunity.complaint.ComplaintDtos.*;

@RestController
@RequestMapping("/api/v1/complaints")
public class ComplaintController {
    private final ComplaintService service;

    public ComplaintController(ComplaintService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','SECURITY','RESIDENT')")
    @GetMapping
    public Object all(@RequestParam(required = false) UUID apartmentId,
                      @RequestParam(required = false) Integer page,
                      @RequestParam(required = false) Integer size,
                      @RequestParam(required = false, defaultValue = "false") boolean mine,
                      @AuthenticationPrincipal UserPrincipal principal) {
        if (page != null) {
            return service.page(principal, apartmentId, page, size == null ? 20 : size, mine);
        }
        return service.all(principal, apartmentId, mine);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @PostMapping
    public ResponseEntity<Response> create(@Valid @RequestBody CreateRequest r,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(service.create(r, principal));
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','SECURITY')")
    @PatchMapping("/{id}/status")
    public Response update(@PathVariable UUID id, @Valid @RequestBody StatusRequest r,
                           @AuthenticationPrincipal UserPrincipal principal) {
        return service.update(id, r, principal);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF','RESIDENT')")
    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponse> comment(@PathVariable UUID id,
                                                   @Valid @RequestBody CommentRequest r,
                                                   @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(service.addComment(id, r, principal));
    }
}
