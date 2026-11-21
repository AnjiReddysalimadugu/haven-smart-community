package com.smartcommunity.property;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface FlatRepository extends JpaRepository<Flat, UUID> {
    List<Flat> findByFloorIdOrderByFlatNumber(UUID floorId);

    @Query("""
            select f from Flat f
            where f.floor.block.apartment.id = :apartmentId
            order by f.flatNumber
            """)
    List<Flat> findByApartmentIdOrderByFlatNumber(@Param("apartmentId") UUID apartmentId);
}
