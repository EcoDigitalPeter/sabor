package com.ottimizo.stores;

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
 * CRUD administrativo de lojas (BE-D02). Regra de negocio principal: nao
 * pode existir mais que uma loja com o mesmo nome (case-insensitive) na
 * mesma cidade — validado aqui antes de gravar e tambem protegido por
 * indice unico na base de dados ({@code ux_stores_name_city}, V004), pelo
 * que qualquer violacao residual (corrida entre pedidos concorrentes) e
 * apanhada na gravacao e traduzida para o mesmo erro de negocio.
 */
@Service
public class AdminStoreService {

    private final StoreRepository stores;
    private final AuditService audit;

    public AdminStoreService(StoreRepository stores, AuditService audit) {
        this.stores = stores;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<StoreResponse> list(String q, Pageable pageable) {
        Page<Store> page = (q == null || q.isBlank())
            ? stores.findAll(pageable)
            : stores.findByNameContainingIgnoreCaseOrCityContainingIgnoreCase(q, q, pageable);
        return PageResponse.from(page.map(StoreResponse::from));
    }

    @Transactional(readOnly = true)
    public StoreResponse get(Long id) {
        return StoreResponse.from(findOrThrow(id));
    }

    @Transactional
    public StoreResponse create(StoreRequest request, CurrentUser actor) {
        assertNotDuplicate(request.name(), request.city(), null);
        Store store = new Store(
            request.name(),
            request.province(),
            request.city(),
            request.neighborhood(),
            request.addressLine(),
            request.contact(),
            request.deliveryAvailable(),
            request.rating(),
            request.openingHoursText(),
            request.averagePriceLevel(),
            request.latitude(),
            request.longitude()
        );
        saveOrThrowDuplicate(store);
        audit.record(actor, "STORE_CREATED", "store", store.id());
        return StoreResponse.from(store);
    }

    @Transactional
    public StoreResponse update(Long id, StoreRequest request, CurrentUser actor) {
        Store store = findOrThrow(id);
        assertNotDuplicate(request.name(), request.city(), id);
        store.applyUpdate(
            request.name(),
            request.province(),
            request.city(),
            request.neighborhood(),
            request.addressLine(),
            request.contact(),
            request.deliveryAvailable(),
            request.rating(),
            request.openingHoursText(),
            request.averagePriceLevel(),
            request.latitude(),
            request.longitude()
        );
        saveOrThrowDuplicate(store);
        audit.record(actor, "STORE_UPDATED", "store", id);
        return StoreResponse.from(store);
    }

    @Transactional
    public void delete(Long id, CurrentUser actor) {
        Store store = findOrThrow(id);
        try {
            stores.delete(store);
            stores.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ServiceException(ErrorCode.LSA024_STORE_IN_USE);
        }
        audit.record(actor, "STORE_DELETED", "store", id);
    }

    @Transactional
    public StoreResponse setStatus(Long id, StoreStatus status, CurrentUser actor) {
        Store store = findOrThrow(id);
        store.changeStatus(status);
        audit.record(actor, "STORE_STATUS_CHANGED", "store", id, Map.of("status", status.name()));
        return StoreResponse.from(store);
    }

    private void assertNotDuplicate(String name, String city, Long excludingId) {
        boolean duplicate = excludingId == null
            ? stores.existsByNameIgnoreCaseAndCityIgnoreCase(name, city)
            : stores.existsByNameIgnoreCaseAndCityIgnoreCaseAndIdNot(name, city, excludingId);
        if (duplicate) {
            throw new ServiceException(ErrorCode.LSA006_DUPLICATE, "Ja existe uma loja com este nome nesta cidade.");
        }
    }

    private void saveOrThrowDuplicate(Store store) {
        try {
            stores.saveAndFlush(store);
        } catch (DataIntegrityViolationException ex) {
            throw new ServiceException(ErrorCode.LSA006_DUPLICATE, "Ja existe uma loja com este nome nesta cidade.");
        }
    }

    private Store findOrThrow(Long id) {
        return stores.findById(id).orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
    }
}
