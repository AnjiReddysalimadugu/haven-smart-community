package com.smartcommunity.search;

import com.smartcommunity.auth.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import static com.smartcommunity.search.SearchDtos.SearchResponse;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController {
    private final SearchService service;

    public SearchController(SearchService service) {
        this.service = service;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public SearchResponse search(
            @RequestParam String q,
            @RequestParam(required = false) UUID apartmentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return service.search(q, apartmentId, principal);
    }
}
