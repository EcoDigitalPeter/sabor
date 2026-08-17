package com.ottimizo.users;

import com.ottimizo.common.security.Role;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminUserResponse(
    Long id,
    UUID authUserId,
    String name,
    String email,
    Role role,
    UserStatus status,
    Long storeId,
    OffsetDateTime lastLoginAt
) {

    public static AdminUserResponse from(AppUser user) {
        return new AdminUserResponse(
            user.id(),
            user.authUserId(),
            user.name(),
            user.email(),
            user.role(),
            user.status(),
            user.storeId(),
            user.lastLoginAt()
        );
    }
}
