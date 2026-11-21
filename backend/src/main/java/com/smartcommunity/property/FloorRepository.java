package com.smartcommunity.property;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FloorRepository extends JpaRepository<Floor, UUID> {
    List<Floor> findByBlockIdOrderByFloorNumber(UUID blockId);
}
