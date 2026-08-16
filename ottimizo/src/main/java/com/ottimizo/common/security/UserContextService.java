package com.ottimizo.common.security;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.users.AppUser;
import com.ottimizo.users.AppUserRepository;
import com.ottimizo.users.UserStatus;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class UserContextService {

    private final AppUserRepository users;

    public UserContextService(AppUserRepository users) {
        this.users = users;
    }

    public CurrentUser currentUser(Jwt jwt) {
        UUID authUserId = UUID.fromString(jwt.getSubject());
        AppUser user = users.findByAuthUserId(authUserId)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA004_FORBIDDEN));
        if (user.status() == UserStatus.SUSPENDED) {
            throw new ServiceException(ErrorCode.LSA003_ACCOUNT_SUSPENDED);
        }
        return new CurrentUser(user.id(), user.authUserId(), user.email(), user.role(), user.storeId());
    }
}
