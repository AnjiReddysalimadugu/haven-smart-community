package com.smartcommunity.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoginOtpRepository extends JpaRepository<LoginOtp, UUID> {
    @Query("""
            select o from LoginOtp o
            where o.email = :email
              and o.consumedAt is null
              and o.expiresAt > :now
            order by o.createdAt desc
            """)
    List<LoginOtp> findActive(@Param("email") String email, @Param("now") Instant now);

    default Optional<LoginOtp> findLatestActive(String email, Instant now) {
        List<LoginOtp> rows = findActive(email, now);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    long countByEmailAndCreatedAtAfter(String email, Instant after);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update LoginOtp o
               set o.consumedAt = :now
             where o.email = :email
               and o.consumedAt is null
            """)
    int consumeAllOpen(@Param("email") String email, @Param("now") Instant now);
}
