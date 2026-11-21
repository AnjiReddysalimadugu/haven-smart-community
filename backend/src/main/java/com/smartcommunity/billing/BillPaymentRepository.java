package com.smartcommunity.billing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BillPaymentRepository extends JpaRepository<BillPayment, UUID> {
    List<BillPayment> findAllByOrderByPaidAtDesc();

    @Query("""
            select p from BillPayment p
            where p.bill.flat.id = :flatId
            order by p.paidAt desc
            """)
    List<BillPayment> findByFlatIdOrderByPaidAtDesc(@Param("flatId") UUID flatId);

    @Query("""
            select p from BillPayment p
            where p.bill.flat.floor.block.apartment.id = :apartmentId
            order by p.paidAt desc
            """)
    List<BillPayment> findByApartmentIdOrderByPaidAtDesc(@Param("apartmentId") UUID apartmentId);

    boolean existsByBillId(UUID billId);
}
