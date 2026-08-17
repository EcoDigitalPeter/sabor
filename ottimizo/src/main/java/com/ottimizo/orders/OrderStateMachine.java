package com.ottimizo.orders;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Maquina de estados das transicoes de encomenda do lado da loja (BE-L04,
 * F3-LOJ-03): {@code PENDENTE -> ACEITE -> EM_PREPARACAO -> PRONTA ->
 * CONCLUIDA}, com {@code RECUSADA} possivel a partir de PENDENTE/ACEITE.
 *
 * <p>{@code CANCELADA} nao aparece como destino nesta maquina de propositos —
 * e accao exclusiva do cliente ({@link Order#cancel()} / {@code
 * OrderService#cancel}, BE-C07), nunca uma transicao que a loja possa
 * desencadear. {@code CONCLUIDA}, {@code RECUSADA} e {@code CANCELADA} sao
 * estados terminais: nenhuma transicao sai deles do lado da loja.
 *
 * <p>Classe sem estado (so metodos estaticos), mesmo espirito do mapa fixo
 * usado no mock MSW que este endpoint substitui
 * ({@code VALID_LOJA_TRANSITIONS} em
 * {@code levesabor-web/src/mocks/fixtures.ts}) — mantida em sincronia de
 * proposito com esse mapa.
 */
public final class OrderStateMachine {

    private static final Map<OrderStatus, Set<OrderStatus>> LOJA_TRANSITIONS = new EnumMap<>(OrderStatus.class);

    static {
        LOJA_TRANSITIONS.put(OrderStatus.PENDENTE, EnumSet.of(OrderStatus.ACEITE, OrderStatus.RECUSADA));
        LOJA_TRANSITIONS.put(OrderStatus.ACEITE, EnumSet.of(OrderStatus.EM_PREPARACAO, OrderStatus.RECUSADA));
        LOJA_TRANSITIONS.put(OrderStatus.EM_PREPARACAO, EnumSet.of(OrderStatus.PRONTA));
        LOJA_TRANSITIONS.put(OrderStatus.PRONTA, EnumSet.of(OrderStatus.CONCLUIDA));
    }

    private OrderStateMachine() {
    }

    /** {@code true} se a loja pode fazer a encomenda passar de {@code from} para {@code to}. */
    public static boolean isValidLojaTransition(OrderStatus from, OrderStatus to) {
        Set<OrderStatus> allowed = LOJA_TRANSITIONS.get(from);
        return allowed != null && allowed.contains(to);
    }

    /**
     * Lanca {@link ErrorCode#LSA030_INVALID_ORDER_TRANSITION} se a transicao
     * nao for permitida do lado da loja. Usado por {@link
     * LojaOrderService#updateStatus} antes de qualquer alteracao ao estado.
     */
    public static void assertValidLojaTransition(OrderStatus from, OrderStatus to) {
        if (!isValidLojaTransition(from, to)) {
            throw new ServiceException(
                ErrorCode.LSA030_INVALID_ORDER_TRANSITION,
                "Nao e possivel passar de " + from + " para " + to + "."
            );
        }
    }
}
