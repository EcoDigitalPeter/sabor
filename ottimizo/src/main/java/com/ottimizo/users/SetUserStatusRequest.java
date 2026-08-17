package com.ottimizo.users;

import jakarta.validation.constraints.NotNull;

public record SetUserStatusRequest(
    @NotNull(message = "e obrigatorio")
    UserStatus status
) {
}
