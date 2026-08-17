package com.ottimizo.users;

import com.ottimizo.common.security.Role;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByAuthUserId(UUID authUserId);

    Optional<AppUser> findByEmailIgnoreCase(String email);

    long countByRoleAndStatus(Role role, UserStatus status);

    /**
     * Listagem administrativa (BE-B03) com filtros opcionais por role e por
     * estado — qualquer parametro nulo e ignorado, tal como {@code
     * RecipeRepository#search}.
     */
    @Query("""
        select u from AppUser u
        where (:role is null or u.role = :role)
          and (:status is null or u.status = :status)
        order by u.id desc
        """)
    Page<AppUser> search(@Param("role") Role role, @Param("status") UserStatus status, Pageable pageable);
}
