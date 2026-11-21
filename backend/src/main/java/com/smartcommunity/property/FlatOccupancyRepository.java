package com.smartcommunity.property;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FlatOccupancyRepository extends JpaRepository<FlatOccupancy, UUID> {
    Optional<FlatOccupancy> findByFlatIdAndStatus(UUID flatId, OccupancyStatus status);

    Optional<FlatOccupancy> findByResidentUserIdAndStatus(UUID residentUserId, OccupancyStatus status);

    boolean existsByFlatIdAndStatus(UUID flatId, OccupancyStatus status);

    boolean existsByResidentUserIdAndStatus(UUID residentUserId, OccupancyStatus status);

    List<FlatOccupancy> findByFlatIdOrderByStartedAtDesc(UUID flatId);

    List<FlatOccupancy> findAllByOrderByStartedAtDesc();

    @Query("""
            select o from FlatOccupancy o
            where o.flatId in (
              select f.id from Flat f
              where f.floor.block.apartment.id = :apartmentId
            )
            order by o.startedAt desc
            """)
    List<FlatOccupancy> findByApartmentIdOrderByStartedAtDesc(@Param("apartmentId") UUID apartmentId);
}
