package com.smartcommunity.search;

import java.util.List;
import java.util.UUID;

public final class SearchDtos {
    private SearchDtos() {
    }

    public record SearchHit(
            String type,
            UUID id,
            String label,
            String detail,
            String href
    ) {
    }

    public record SearchResponse(String query, List<SearchHit> hits) {
    }
}
