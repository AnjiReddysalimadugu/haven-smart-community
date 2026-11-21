package com.smartcommunity.visitor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VisitorRepository extends JpaRepository<VisitorPass, UUID> {
    Optional<VisitorPass> findByTokenHash(String tokenHash);

    List<VisitorPass> findAllByOrderByCreatedAtDesc();

    List<VisitorPass> findByFlatIdOrderByCreatedAtDesc(UUID flatId);

    @Query("""
            select p from VisitorPass p
            where p.flat.floor.block.apartment.id = :apartmentId
            order by p.createdAt desc
            """)
    List<VisitorPass> findByApartmentIdOrderByCreatedAtDesc(@Param("apartmentId") UUID apartmentId);
}
