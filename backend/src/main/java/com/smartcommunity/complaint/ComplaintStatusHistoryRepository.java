package com.smartcommunity.complaint;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ComplaintStatusHistoryRepository extends JpaRepository<ComplaintStatusHistory, UUID> {
    List<ComplaintStatusHistory> findByComplaintIdOrderByCreatedAtAsc(UUID complaintId);
}
