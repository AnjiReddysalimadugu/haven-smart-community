package com.smartcommunity.family;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, UUID> {
    List<FamilyMember> findByFlatIdAndActiveTrueOrderByFullNameAsc(UUID flatId);

    List<FamilyMember> findByFlatIdOrderByFullNameAsc(UUID flatId);

    boolean existsByFlatIdAndFullNameIgnoreCaseAndRelationIgnoreCaseAndActiveTrue(
            UUID flatId, String fullName, String relation);

    @Query("""
            select f from FamilyMember f
            where f.flat.floor.block.apartment.id = :apartmentId and f.active = true
            order by f.flat.flatNumber, f.fullName
            """)
    List<FamilyMember> findActiveByApartmentId(@Param("apartmentId") UUID apartmentId);
}
