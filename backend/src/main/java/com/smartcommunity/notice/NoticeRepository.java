package com.smartcommunity.notice;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NoticeRepository extends JpaRepository<Notice, UUID> {
    List<Notice> findByApartmentIdOrderByPublishedAtDesc(UUID apartmentId);

    List<Notice> findByApartmentIdAndActiveTrueOrderByPublishedAtDesc(UUID apartmentId);
}
