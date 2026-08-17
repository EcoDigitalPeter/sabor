package com.ottimizo.loja;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * Lookup com ownership embutido na query: se o produto existir mas
     * pertencer a outra loja, o resultado e vazio (nao lanca 403). Usado por
     * {@link LojaProductService} em todos os acessos por id.
     */
    Optional<Product> findByIdAndStoreId(Long id, Long storeId);

    Page<Product> findByStoreId(Long storeId, Pageable pageable);

    Page<Product> findByStoreIdAndNameContainingIgnoreCase(Long storeId, String name, Pageable pageable);

    Page<Product> findByStoreIdAndStatus(Long storeId, ProductStatus status, Pageable pageable);

    Page<Product> findByStoreIdAndStatusAndNameContainingIgnoreCase(
        Long storeId, ProductStatus status, String name, Pageable pageable
    );

    boolean existsByStoreIdAndNameIgnoreCase(Long storeId, String name);

    boolean existsByStoreIdAndNameIgnoreCaseAndIdNot(Long storeId, String name, Long id);
}
