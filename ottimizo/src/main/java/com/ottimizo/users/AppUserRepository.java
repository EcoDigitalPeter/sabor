package com.ottimizo.users;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByAuthUserId(UUID authUserId);

    Optional<AppUser> findByEmailIgnoreCase(String email);
}
