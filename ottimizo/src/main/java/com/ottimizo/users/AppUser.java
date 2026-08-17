package com.ottimizo.users;

import com.ottimizo.common.security.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auth_user_id", nullable = false)
    private UUID authUserId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.CLIENTE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "store_id")
    private Long storeId;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    protected AppUser() {
    }

    public AppUser(UUID authUserId, String name, String email, Role role) {
        this(authUserId, name, email, role, null);
    }

    public AppUser(UUID authUserId, String name, String email, Role role, Long storeId) {
        this.authUserId = authUserId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.storeId = storeId;
    }

    /**
     * Suspensao/reactivacao administrativa (BE-B03). A revogacao da sessao
     * Supabase correspondente e feita a parte pelo {@code AdminUserService}
     * via {@link com.ottimizo.users.SupabaseSessionRevoker} — esta chamada
     * so altera o estado local.
     */
    public void changeStatus(UserStatus status) {
        this.status = status;
    }

    public Long id() {
        return id;
    }

    public UUID authUserId() {
        return authUserId;
    }

    public String name() {
        return name;
    }

    public String email() {
        return email;
    }

    public Role role() {
        return role;
    }

    public UserStatus status() {
        return status;
    }

    public Long storeId() {
        return storeId;
    }

    public OffsetDateTime lastLoginAt() {
        return lastLoginAt;
    }
}
