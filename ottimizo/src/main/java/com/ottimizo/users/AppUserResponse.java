package com.ottimizo.users;

import com.ottimizo.common.security.Role;
import java.util.UUID;

public record AppUserResponse(
    Long id,
    UUID authUserId,
    String name,
    String email,
    Role role,
    UserStatus status
) {

    public static AppUserResponse from(AppUser user) {
        return new AppUserResponse(
            user.id(),
            user.authUserId(),
            user.name(),
            user.email(),
            user.role(),
            user.status()
        );
    }
}
