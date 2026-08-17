package com.ottimizo.plans;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShoppingListItemRepository extends JpaRepository<ShoppingListItem, Long> {

    List<ShoppingListItem> findByShoppingList_IdOrderByIdAsc(Long shoppingListId);

    List<ShoppingListItem> findByShoppingList_IdAndOrigin(Long shoppingListId, ShoppingListItemOrigin origin);

    /**
     * Traz o item com a lista associada numa unica query (join fetch), para
     * {@code ShoppingListService} poder verificar ownership (lista.userId ==
     * utilizador autenticado) sem N+1.
     */
    @Query("""
        select i from ShoppingListItem i
        join fetch i.shoppingList l
        where i.id = :id
        """)
    Optional<ShoppingListItem> findByIdWithList(@Param("id") Long id);
}
