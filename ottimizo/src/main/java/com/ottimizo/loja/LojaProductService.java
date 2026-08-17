package com.ottimizo.loja;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * CRUD de produtos da loja autenticada (BE-L02).
 *
 * <p>O storeId usado em todos os metodos vem sempre de {@link #ownStoreId},
 * que delega em {@link CurrentUser#requireOwnStoreId(Long)} — nunca de um
 * valor recebido no pedido. Como aqui nao ha {@code storeId} no path (as
 * rotas sao {@code /api/v1/loja/products/**}, ja restritas a ROLE_LOJISTA
 * em {@code SecurityConfig}), o "storeId pedido" passado a
 * {@code requireOwnStoreId} e sempre o proprio {@code actor.storeId()}: o
 * ponto da chamada nao e validar um valor externo contra o do utilizador
 * (nao ha nenhum aqui), mas garantir, num unico sitio, que o actor e de
 * facto LOJISTA com uma loja atribuida antes de qualquer acesso a
 * {@link ProductRepository}.
 *
 * <p>Um produto que exista mas pertenca a outra loja resulta em 404
 * (LSA005_NOT_FOUND), nunca 403 — para nao revelar a outra loja se um dado
 * id de produto existe ou nao.
 */
@Service
public class LojaProductService {

    private final ProductRepository products;
    private final AuditService audit;

    public LojaProductService(ProductRepository products, AuditService audit) {
        this.products = products;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> list(CurrentUser actor, String q, ProductStatus status, Pageable pageable) {
        Long storeId = ownStoreId(actor);
        Page<Product> page = query(storeId, q, status, pageable);
        return PageResponse.from(page.map(ProductResponse::from));
    }

    @Transactional(readOnly = true)
    public ProductResponse get(CurrentUser actor, Long id) {
        return ProductResponse.from(findOwnedOrThrow(id, ownStoreId(actor)));
    }

    @Transactional
    public ProductResponse create(CurrentUser actor, ProductRequest request) {
        Long storeId = ownStoreId(actor);
        assertNotDuplicate(storeId, request.name(), null);
        Product product = new Product(
            storeId,
            request.name(),
            request.category(),
            request.unitLabel(),
            request.priceMt(),
            request.ingredientId()
        );
        saveOrThrowDuplicate(product);
        audit.record(actor, "PRODUCT_CREATED", "product", product.id());
        return ProductResponse.from(product);
    }

    @Transactional
    public ProductResponse update(CurrentUser actor, Long id, ProductRequest request) {
        Long storeId = ownStoreId(actor);
        Product product = findOwnedOrThrow(id, storeId);
        assertNotDuplicate(storeId, request.name(), id);
        product.applyUpdate(
            request.name(),
            request.category(),
            request.unitLabel(),
            request.priceMt(),
            request.ingredientId()
        );
        saveOrThrowDuplicate(product);
        audit.record(actor, "PRODUCT_UPDATED", "product", id);
        return ProductResponse.from(product);
    }

    @Transactional
    public void delete(CurrentUser actor, Long id) {
        Long storeId = ownStoreId(actor);
        Product product = findOwnedOrThrow(id, storeId);
        products.delete(product);
        audit.record(actor, "PRODUCT_DELETED", "product", id);
    }

    @Transactional
    public ProductResponse setStatus(CurrentUser actor, Long id, ProductStatus status) {
        Long storeId = ownStoreId(actor);
        Product product = findOwnedOrThrow(id, storeId);
        product.changeStatus(status);
        audit.record(actor, "PRODUCT_STATUS_CHANGED", "product", id, Map.of("status", status.name()));
        return ProductResponse.from(product);
    }

    private Long ownStoreId(CurrentUser actor) {
        return actor.requireOwnStoreId(actor.storeId());
    }

    private Page<Product> query(Long storeId, String q, ProductStatus status, Pageable pageable) {
        boolean hasQuery = q != null && !q.isBlank();
        if (status != null && hasQuery) {
            return products.findByStoreIdAndStatusAndNameContainingIgnoreCase(storeId, status, q.trim(), pageable);
        }
        if (status != null) {
            return products.findByStoreIdAndStatus(storeId, status, pageable);
        }
        if (hasQuery) {
            return products.findByStoreIdAndNameContainingIgnoreCase(storeId, q.trim(), pageable);
        }
        return products.findByStoreId(storeId, pageable);
    }

    private void assertNotDuplicate(Long storeId, String name, Long excludingId) {
        boolean duplicate = excludingId == null
            ? products.existsByStoreIdAndNameIgnoreCase(storeId, name)
            : products.existsByStoreIdAndNameIgnoreCaseAndIdNot(storeId, name, excludingId);
        if (duplicate) {
            throw new ServiceException(ErrorCode.LSA006_DUPLICATE, "Ja existe um produto com este nome nesta loja.");
        }
    }

    private void saveOrThrowDuplicate(Product product) {
        try {
            products.saveAndFlush(product);
        } catch (DataIntegrityViolationException ex) {
            throw new ServiceException(ErrorCode.LSA006_DUPLICATE, "Ja existe um produto com este nome nesta loja.");
        }
    }

    private Product findOwnedOrThrow(Long id, Long storeId) {
        return products.findByIdAndStoreId(id, storeId)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
    }
}
