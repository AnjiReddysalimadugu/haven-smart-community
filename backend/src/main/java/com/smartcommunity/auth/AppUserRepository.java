package com.smartcommunity.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<AppUser> findByRoleAndApartmentIdOrderByFullNameAsc(Role role, UUID apartmentId);

    List<AppUser> findByRoleOrderByFullNameAsc(Role role);

    List<AppUser> findByApartmentIdOrderByFullNameAsc(UUID apartmentId);

    List<AppUser> findAllByOrderByFullNameAsc();

    Optional<AppUser> findFirstByFlatIdAndRoleAndActiveTrue(UUID flatId, Role role);

    @Query("""
            select u from AppUser u
            where u.role = com.smartcommunity.auth.Role.RESIDENT
              and (:apartmentId is null or u.apartmentId = :apartmentId)
            order by u.fullName asc
            """)
    List<AppUser> findResidents(@Param("apartmentId") UUID apartmentId);

    @Query("""
            select u from AppUser u
            where (:apartmentId is null or u.apartmentId = :apartmentId)
              and (:role is null or u.role = :role)
            order by u.fullName asc
            """)
    List<AppUser> findFiltered(@Param("apartmentId") UUID apartmentId, @Param("role") Role role);

    long countByActiveTrue();

    long countByApartmentId(UUID apartmentId);

    long countByApartmentIdAndActiveTrue(UUID apartmentId);
}
