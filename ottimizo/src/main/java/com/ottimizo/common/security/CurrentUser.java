package com.ottimizo.common.security;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import java.util.UUID;

public record CurrentUser(
    Long id,
    UUID authUserId,
    String email,
    Role role,
    Long storeId
) {

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    public boolean isCliente() {
        return role == Role.CLIENTE;
    }

    public boolean isLojista() {
        return role == Role.LOJISTA;
    }

    /**
     * Mecanismo de ownership por loja (BE-L01). {@code SecurityConfig} ja
     * restringe {@code /api/v1/loja/**} a {@code ROLE_LOJISTA}; isto cobre a
     * segunda metade do RBAC — garantir que o {@code storeId} que o service
     * vai usar e sempre o da loja do utilizador autenticado, nunca um valor
     * vindo do pedido (path/query/body) sem validacao.
     *
     * <p>Uso pretendido pelos futuros {@code LojaProductController}/
     * {@code LojaOrderController} (BE-L02/BE-L04, ainda por construir — este
     * cartao so estabelece o padrao, nao o dominio): o controller extrai o
     * {@code storeId} do pedido (ex. path variable) e chama
     * {@code actor.requireOwnStoreId(storeId)} antes de invocar o service,
     * em vez de cada service repetir a comparacao manualmente.
     *
     * @param requestedStoreId storeId indicado no pedido (nunca confiar nele
     *     sem esta validacao)
     * @return o mesmo {@code requestedStoreId}, validado, para permitir
     *     encadear a chamada (ex. {@code service.list(actor.requireOwnStoreId(storeId))})
     * @throws ServiceException LSA004_FORBIDDEN se o utilizador autenticado
     *     nao for LOJISTA (nao tem storeId nenhum); LSA007_STORE_OWNERSHIP se
     *     o storeId pedido nao corresponder ao storeId do utilizador
     */
    public Long requireOwnStoreId(Long requestedStoreId) {
        if (!isLojista() || storeId == null) {
            throw new ServiceException(ErrorCode.LSA004_FORBIDDEN);
        }
        if (requestedStoreId == null || !storeId.equals(requestedStoreId)) {
            throw new ServiceException(ErrorCode.LSA007_STORE_OWNERSHIP);
        }
        return requestedStoreId;
    }
}
