package com.smartcommunity.complaint;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ComplaintRepository extends JpaRepository<Complaint, UUID> {
    List<Complaint> findAllByOrderByCreatedAtDesc();

    List<Complaint> findByFlatIdOrderByCreatedAtDesc(UUID flatId);

    List<Complaint> findByAssigneeUserIdOrderByCreatedAtDesc(UUID assigneeUserId);

    @Query("""
            select c from Complaint c
            where c.flat.floor.block.apartment.id = :apartmentId
            order by c.createdAt desc
            """)
    List<Complaint> findByApartmentIdOrderByCreatedAtDesc(@Param("apartmentId") UUID apartmentId);
}
