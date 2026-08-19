package com.ottimizo.loja;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportJobRepository extends JpaRepository<ImportJob, Long> {

    /**
     * Usado por {@link LojaImportService#confirm} — um job que exista mas
     * pertenca a outra loja resulta em 404 (LSA005_NOT_FOUND), nunca 403,
     * tal como {@link ProductRepository#findByIdAndStoreId}.
     */
    Optional<ImportJob> findByIdAndStoreId(Long id, Long storeId);
}
