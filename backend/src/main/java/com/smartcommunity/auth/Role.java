package com.smartcommunity.auth;

/**
 * Role hierarchy (Spring Security): SUPER_ADMIN &gt; APARTMENT_ADMIN &gt; ADMIN (legacy).
 * ADMIN is retained so existing {@code hasRole('ADMIN')} annotations keep working
 * for APARTMENT_ADMIN and SUPER_ADMIN via {@link org.springframework.security.access.hierarchicalroles.RoleHierarchy}.
 */
public enum Role {
    SUPER_ADMIN,
    APARTMENT_ADMIN,
    /** @deprecated Prefer {@link #APARTMENT_ADMIN}; kept for JWT/API compatibility. */
    ADMIN,
    STAFF,
    SECURITY,
    RESIDENT
}
