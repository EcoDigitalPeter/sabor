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
     * Carrega receitas com {@code ingredients}/{@code ingredient} num unico
     * round-trip (join fetch), para agregadores como
     * {@code com.ottimizo.plans.ShoppingListService#rebuildForPlan} nao
     * pagarem N+1 ao ler as linhas de ingrediente de varias receitas do
     * plano. {@code distinct} porque o join fetch de uma colecao
     * {@code OneToMany} duplica a linha "um" por cada "muitos".
     */
    @Query("""
        select distinct r from Recipe r
        left join fetch r.ingredients ri
        left join fetch ri.ingredient
        where r.id in :ids
        """)
    List<Recipe> findByIdInWithIngredients(@Param("ids") List<Long> ids);
}
