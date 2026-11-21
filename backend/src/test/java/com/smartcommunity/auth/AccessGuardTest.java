package com.smartcommunity.auth;

import com.smartcommunity.property.FlatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AccessGuardTest {
    @Mock FlatRepository flats;
    AccessGuard guard;

    @BeforeEach
    void setUp() {
        guard = new AccessGuard(flats);
    }

    @Test
    void apartmentAdminCannotAccessOtherApartment() {
        UUID home = UUID.randomUUID();
        UUID other = UUID.randomUUID();
        UserPrincipal admin = principal(Role.APARTMENT_ADMIN, home, null);
        assertThrows(AccessDeniedException.class, () -> guard.requireApartmentAccess(admin, other));
        assertDoesNotThrow(() -> guard.requireApartmentAccess(admin, home));
    }

    @Test
    void superAdminCanAccessAnyApartment() {
        UserPrincipal superAdmin = principal(Role.SUPER_ADMIN, null, null);
        assertDoesNotThrow(() -> guard.requireApartmentAccess(superAdmin, UUID.randomUUID()));
    }

    @Test
    void residentSelfCheck() {
        UUID id = UUID.randomUUID();
        UserPrincipal resident = principal(Role.RESIDENT, UUID.randomUUID(), UUID.randomUUID());
        // UserPrincipal id comes from AppUser — build carefully
        assertThrows(AccessDeniedException.class, () -> guard.requireResidentSelfOrAdmin(resident, UUID.randomUUID()));
    }

    private UserPrincipal principal(Role role, UUID apartmentId, UUID flatId) {
        AppUser user = new AppUser("t@test.local", "hash", "Test", role);
        user.setApartmentId(apartmentId);
        user.setFlatId(flatId);
        return new UserPrincipal(user);
    }
}
