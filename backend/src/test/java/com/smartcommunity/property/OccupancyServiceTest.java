package com.smartcommunity.property;

import com.smartcommunity.auth.*;
import com.smartcommunity.common.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OccupancyServiceTest {
    @Mock FlatOccupancyRepository occupancies;
    @Mock FlatRepository flats;
    @Mock AppUserRepository users;
    @Mock com.smartcommunity.parking.ParkingRepository parking;
    @Mock AccessGuard accessGuard;

    OccupancyService service;
    UUID flatId = UUID.randomUUID();
    UUID residentId = UUID.randomUUID();
    UUID apartmentId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new OccupancyService(occupancies, flats, users, parking, accessGuard);
    }

    @Test
    void allocateRejectsDuplicateActiveFlat() {
        Flat flat = mockFlat();
        when(accessGuard.requireAccessibleFlat(any(), eq(flatId))).thenReturn(flat);
        when(accessGuard.isSocietyAdmin(any())).thenReturn(true);
        when(occupancies.existsByFlatIdAndStatus(flatId, OccupancyStatus.ACTIVE)).thenReturn(true);

        UserPrincipal admin = admin();
        var req = new OccupancyDtos.AllocateRequest(residentId, OccupancyType.OWNER, null);
        assertThrows(BusinessException.class, () -> service.allocate(flatId, req, admin));
        verify(occupancies, never()).save(any());
    }

    @Test
    void allocatePersistsOccupancyAndUpdatesFlat() {
        Flat flat = mockFlat();
        AppUser resident = new AppUser("r@test.local", "hash", "Res", Role.RESIDENT);
        resident.setApartmentId(apartmentId);
        resident.setActive(true);

        when(accessGuard.requireAccessibleFlat(any(), eq(flatId))).thenReturn(flat);
        when(accessGuard.isSocietyAdmin(any())).thenReturn(true);
        when(occupancies.existsByFlatIdAndStatus(flatId, OccupancyStatus.ACTIVE)).thenReturn(false);
        when(occupancies.existsByResidentUserIdAndStatus(residentId, OccupancyStatus.ACTIVE)).thenReturn(false);
        when(users.findById(residentId)).thenReturn(Optional.of(resident));
        when(occupancies.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(flats.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Force resident id via reflection is hard; use spy pattern — set id by saving through repository mock
        // AppUser id is null until persisted; OccupancyService uses request.residentUserId for lookup only.
        // FlatOccupancy stores residentUserId from resident.getId() which is null — fix service to use request id
        // For this test, stub resident.getId by using a real UUID via Answer after findById returns user with id.
        // Simplest: use ArgumentCaptor and verify flat status change.
        try {
            var idField = AppUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(resident, residentId);
        } catch (Exception e) {
            fail(e);
        }

        UserPrincipal admin = admin();
        var req = new OccupancyDtos.AllocateRequest(residentId, OccupancyType.TENANT, "note");
        var response = service.allocate(flatId, req, admin);

        assertEquals(OccupancyType.TENANT, response.occupancyType());
        assertEquals(FlatStatus.TENANT_OCCUPIED, flat.getStatus());
        assertEquals(flatId, resident.getFlatId());
        ArgumentCaptor<FlatOccupancy> cap = ArgumentCaptor.forClass(FlatOccupancy.class);
        verify(occupancies).save(cap.capture());
        assertEquals(OccupancyStatus.ACTIVE, cap.getValue().getStatus());
    }

    private Flat mockFlat() {
        Apartment apt = new Apartment("A", "Addr", "Asia/Kolkata");
        try {
            var idField = Apartment.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(apt, apartmentId);
        } catch (Exception e) {
            fail(e);
        }
        Block block = new Block(apt, "A", "A");
        Floor floor = new Floor(block, 1, "First");
        Flat flat = new Flat(floor, "A-102", new BigDecimal("1000"), 2);
        try {
            var idField = Flat.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(flat, flatId);
        } catch (Exception e) {
            fail(e);
        }
        return flat;
    }

    private UserPrincipal admin() {
        AppUser user = new AppUser("a@test.local", "hash", "Admin", Role.APARTMENT_ADMIN);
        user.setApartmentId(apartmentId);
        return new UserPrincipal(user);
    }
}
