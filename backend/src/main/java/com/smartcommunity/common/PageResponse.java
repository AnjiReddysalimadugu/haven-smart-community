package com.smartcommunity.common;

import java.util.List;

public record PageResponse<T>(List<T> items, long total, int page, int size) {
    public static <T> PageResponse<T> of(List<T> full, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 200);
        int safePage = Math.max(page, 0);
        long total = full.size();
        int from = Math.min(safePage * safeSize, full.size());
        int to = Math.min(from + safeSize, full.size());
        return new PageResponse<>(full.subList(from, to), total, safePage, safeSize);
    }
}
