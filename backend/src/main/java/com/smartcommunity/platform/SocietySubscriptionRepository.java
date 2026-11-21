package com.smartcommunity.platform;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SocietySubscriptionRepository extends JpaRepository<SocietySubscription, UUID> {
    Optional<SocietySubscription> findByApartmentId(UUID apartmentId);
}
