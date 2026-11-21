package com.smartcommunity.notify;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushTokenRepository extends JpaRepository<PushToken, UUID> {
    Optional<PushToken> findByToken(String token);
    List<PushToken> findByUserId(UUID userId);
    void deleteByToken(String token);
}
