package com.ottimizo.stores;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreRankingCacheRepository extends JpaRepository<StoreRankingCache, Long> {

    Optional<StoreRankingCache> findByUserIdAndAddressHashAndExpiresAtAfter(
        Long userId,
        String addressHash,
        OffsetDateTime now
    );

    Optional<StoreRankingCache> findByUserIdAndAddressHash(Long userId, String addressHash);
}
