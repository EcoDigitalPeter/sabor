package com.ottimizo.stores;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreRepository extends JpaRepository<Store, Long> {

    List<Store> findByStatus(StoreStatus status);
}
