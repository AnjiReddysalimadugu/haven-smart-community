package com.smartcommunity.billing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BillRepository extends JpaRepository<Bill, UUID> {
    List<Bill> findAllByOrderByCreatedAtDesc();

    List<Bill> findByFlatIdOrderByCreatedAtDesc(UUID flatId);

    @Query("""
            select b from Bill b
            where b.flat.floor.block.apartment.id = :apartmentId
            order by b.createdAt desc
            """)
    List<Bill> findByApartmentIdOrderByCreatedAtDesc(@Param("apartmentId") UUID apartmentId);

    boolean existsByFlatIdAndBillTypeAndBillingPeriod(UUID flatId, String billType, String billingPeriod);
}
