package com.smartcommunity.platform;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface SocietySubscriptionPaymentRepository extends JpaRepository<SocietySubscriptionPayment, UUID> {
    List<SocietySubscriptionPayment> findBySubscriptionIdOrderByPaidOnDesc(UUID subscriptionId);

    @Query("select coalesce(sum(p.amount), 0) from SocietySubscriptionPayment p")
    BigDecimal sumAllPayments();

    @Query("select coalesce(sum(p.amount), 0) from SocietySubscriptionPayment p where p.subscriptionId = :subscriptionId")
    BigDecimal sumBySubscription(UUID subscriptionId);
}
