package com.smartcommunity.emergency;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, UUID> {
    List<EmergencyContact> findByApartmentIdAndActiveTrueOrderBySortOrderAscNameAsc(UUID apartmentId);

    List<EmergencyContact> findByApartmentIdOrderBySortOrderAscNameAsc(UUID apartmentId);

    boolean existsByApartmentIdAndPhoneAndActiveTrue(UUID apartmentId, String phone);
}
