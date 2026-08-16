package com.ottimizo.stores;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "store_rankings_cache")
public class StoreRankingCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "address_hash", nullable = false)
    private String addressHash;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private JsonNode ranking;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    protected StoreRankingCache() {
    }

    public StoreRankingCache(Long userId, String addressHash, JsonNode ranking, OffsetDateTime expiresAt) {
        this.userId = userId;
        this.addressHash = addressHash;
        this.ranking = ranking;
        this.expiresAt = expiresAt;
    }

    public JsonNode ranking() {
        return ranking;
    }

    public void refresh(JsonNode ranking, OffsetDateTime expiresAt) {
        this.ranking = ranking;
        this.expiresAt = expiresAt;
    }
}
