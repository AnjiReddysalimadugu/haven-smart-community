package com.smartcommunity.parking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ParkingRepository extends JpaRepository<ParkingSlot, UUID> {
    List<ParkingSlot> findAllByOrderBySlotCode();

    List<ParkingSlot> findByApartment_IdOrderBySlotCode(UUID apartmentId);

    List<ParkingSlot> findByFlat_Id(UUID flatId);

    @Query("""
            select case when count(p) > 0 then true else false end from ParkingSlot p
            where p.apartment.id = :apartmentId
              and p.flat is not null
              and p.active = true
              and upper(p.vehicleNumber) = upper(:vehicleNumber)
            """)
    boolean existsActiveVehicle(@Param("apartmentId") UUID apartmentId,
                                @Param("vehicleNumber") String vehicleNumber);
}
