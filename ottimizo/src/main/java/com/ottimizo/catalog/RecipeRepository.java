package com.ottimizo.catalog;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    List<Recipe> findByStatus(RecipeStatus status);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    /**
     * Pesquisa administrativa da tabela de receitas (F2-ADM-05): filtro opcional por
     * estado, por tag de saude (pertenca no array {@code health_tags}) e por nome
     * (contains, case-insensitive). Qualquer parametro nulo e' ignorado.
     */
    @Query(
        value = """
            select r.* from recipes r
            where (:status is null or r.status = :status)
              and (:tag is null or :tag = any(r.health_tags))
              and (:q is null or lower(r.name) like lower(concat('%', cast(:q as text), '%')))
            order by r.updated_at desc, r.name asc
            """,
        countQuery = """
            select count(*) from recipes r
            where (:status is null or r.status = :status)
              and (:tag is null or :tag = any(r.health_tags))
              and (:q is null or lower(r.name) like lower(concat('%', cast(:q as text), '%')))
            """,
        nativeQuery = true
    )
    Page<Recipe> search(@Param("status") String status, @Param("tag") String tag, @Param("q") String q, Pageable pageable);

    /**
     * Catalogo navegavel do cliente (BE-C08/F1-CLI-08): so receitas
     * {@code PUBLISHED}, filtro opcional por tags (AND — a receita tem de
     * conter todas as tags pedidas, criterio de aceitacao explicito) e
     * pesquisa opcional por nome (contains, case-insensitive). {@code tagsCsv}
     * nulo ou em branco desliga o filtro de tags; passamos uma string
     * separada por virgulas em vez de um array nativo para evitar problemas
     * de binding de {@code text[]} em query nativa — {@code string_to_array}
     * faz a conversao do lado do Postgres.
     */
    @Query(
        value = """
            select r.* from recipes r
            where r.status = 'PUBLISHED'
              and (:tagsCsv is null or r.health_tags @> string_to_array(cast(:tagsCsv as text), ','))
              and (:q is null or lower(r.name) like lower(concat('%', cast(:q as text), '%')))
            order by r.name asc
            """,
        countQuery = """
            select count(*) from recipes r
            where r.status = 'PUBLISHED'
              and (:tagsCsv is null or r.health_tags @> string_to_array(cast(:tagsCsv as text), ','))
              and (:q is null or lower(r.name) like lower(concat('%', cast(:q as text), '%')))
            """,
        nativeQuery = true
    )
    Page<Recipe> searchPublished(@Param("tagsCsv") String tagsCsv, @Param("q") String q, Pageable pageable);
}
