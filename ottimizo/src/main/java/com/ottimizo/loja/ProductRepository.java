package com.ottimizo.loja;

import java.util.List;
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

    /**
     * Usado por {@link LojaImportService#confirm} para decidir, linha a
     * linha, se um produto do ficheiro Excel deve criar um novo registo ou
     * actualizar um existente (upsert por nome dentro da loja).
     */
    Optional<Product> findByStoreIdAndNameIgnoreCase(Long storeId, String name);

    /** Usado por {@link LojaImportService#export} para gerar o .xlsx completo do catalogo. */
    List<Product> findByStoreIdOrderByNameAsc(Long storeId);

    Page<Product> findByStoreId(Long storeId, Pageable pageable);

    Page<Product> findByStoreIdAndNameContainingIgnoreCase(Long storeId, String name, Pageable pageable);

    Page<Product> findByStoreIdAndStatus(Long storeId, ProductStatus status, Pageable pageable);

    Page<Product> findByStoreIdAndStatusAndNameContainingIgnoreCase(
        Long storeId, ProductStatus status, String name, Pageable pageable
    );

    boolean existsByStoreIdAndNameIgnoreCase(Long storeId, String name);

    boolean existsByStoreIdAndNameIgnoreCaseAndIdNot(Long storeId, String name, Long id);
}
