package com.smartcommunity.common;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PageResponseTest {
    @Test
    void slicesAndReportsTotal() {
        var page = PageResponse.of(List.of("a", "b", "c", "d", "e"), 1, 2);
        assertEquals(List.of("c", "d"), page.items());
        assertEquals(5, page.total());
        assertEquals(1, page.page());
        assertEquals(2, page.size());
    }

    @Test
    void emptyWhenPastEnd() {
        var page = PageResponse.of(List.of("a"), 5, 10);
        assertTrue(page.items().isEmpty());
        assertEquals(1, page.total());
    }
}
