package com.ottimizo.orders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import java.util.EnumSet;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * BE-L04 — cobertura exaustiva da maquina de estados do lado da loja
 * (F3-LOJ-03): todas as transicoes validas listadas explicitamente, e todas
 * as combinacoes {@code (from, to)} fora dessa lista tratadas como
 * invalidas via {@link EnumSource} cruzado, para nao deixar nenhum par por
 * cobrir.
 */
class OrderStateMachineTest {

    // --- transicoes validas ------------------------------------------------

    @Test
    void pendente_podePassarParaAceite() {
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.PENDENTE, OrderStatus.ACEITE)).isTrue();
    }

    @Test
    void pendente_podePassarParaRecusada() {
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.PENDENTE, OrderStatus.RECUSADA)).isTrue();
    }

    @Test
    void aceite_podePassarParaEmPreparacao() {
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.ACEITE, OrderStatus.EM_PREPARACAO)).isTrue();
    }

    @Test
    void aceite_podePassarParaRecusada() {
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.ACEITE, OrderStatus.RECUSADA)).isTrue();
    }

    @Test
    void emPreparacao_podePassarParaPronta() {
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.EM_PREPARACAO, OrderStatus.PRONTA)).isTrue();
    }

    @Test
    void pronta_podePassarParaConcluida() {
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.PRONTA, OrderStatus.CONCLUIDA)).isTrue();
    }

    @Test
    void assertValidLojaTransition_naoLancaNadaParaTransicaoValida() {
        OrderStateMachine.assertValidLojaTransition(OrderStatus.PENDENTE, OrderStatus.ACEITE);
    }

    // --- transicoes invalidas mais obvias -----------------------------------

    @Test
    void pendente_naoPodeSaltarParaEmPreparacao() {
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.PENDENTE, OrderStatus.EM_PREPARACAO)).isFalse();
    }

    @Test
    void pendente_naoPodeSaltarParaConcluida() {
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.PENDENTE, OrderStatus.CONCLUIDA)).isFalse();
    }

    @Test
    void emPreparacao_naoPodeVoltarParaAceite() {
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.EM_PREPARACAO, OrderStatus.ACEITE)).isFalse();
    }

    @Test
    void emPreparacao_naoPodeSerRecusada() {
        // RECUSADA so e permitida a partir de PENDENTE/ACEITE — depois de
        // aceite e em preparacao, a loja ja comprometeu-se a cumprir.
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.EM_PREPARACAO, OrderStatus.RECUSADA)).isFalse();
    }

    @Test
    void pronta_naoPodeSerRecusada() {
        assertThat(OrderStateMachine.isValidLojaTransition(OrderStatus.PRONTA, OrderStatus.RECUSADA)).isFalse();
    }

    @Test
    void nenhumEstado_podeTransitarParaCancelada() {
        // CANCELADA e accao exclusiva do cliente (Order#cancel / BE-C07),
        // nunca uma transicao que a loja possa desencadear.
        for (OrderStatus from : OrderStatus.values()) {
            assertThat(OrderStateMachine.isValidLojaTransition(from, OrderStatus.CANCELADA))
                .as("de %s para CANCELADA", from)
                .isFalse();
        }
    }

    @Test
    void estadoNaoPodeTransitarParaSiProprio() {
        for (OrderStatus status : OrderStatus.values()) {
            assertThat(OrderStateMachine.isValidLojaTransition(status, status))
                .as("de %s para %s (mesmo estado)", status, status)
                .isFalse();
        }
    }

    @ParameterizedTest
    @EnumSource(OrderStatus.class)
    void estadosTerminais_naoTemNenhumaTransicaoValida(OrderStatus from) {
        Set<OrderStatus> terminais = EnumSet.of(OrderStatus.CONCLUIDA, OrderStatus.RECUSADA, OrderStatus.CANCELADA);
        if (!terminais.contains(from)) {
            return;
        }
        for (OrderStatus to : OrderStatus.values()) {
            assertThat(OrderStateMachine.isValidLojaTransition(from, to))
                .as("de %s (terminal) para %s", from, to)
                .isFalse();
        }
    }

    /** Todas as 49 combinacoes (7x7) de {@code (from, to)}, exaustivamente. */
    @ParameterizedTest
    @MethodSource("todasAsCombinacoes")
    void isValidLojaTransition_correspondeExactamenteAsTransicoesListadas(OrderStatus from, OrderStatus to, boolean esperado) {
        assertThat(OrderStateMachine.isValidLojaTransition(from, to))
            .as("de %s para %s", from, to)
            .isEqualTo(esperado);
    }

    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> todasAsCombinacoes() {
        Set<java.util.Map.Entry<OrderStatus, OrderStatus>> validas = Set.of(
            java.util.Map.entry(OrderStatus.PENDENTE, OrderStatus.ACEITE),
            java.util.Map.entry(OrderStatus.PENDENTE, OrderStatus.RECUSADA),
            java.util.Map.entry(OrderStatus.ACEITE, OrderStatus.EM_PREPARACAO),
            java.util.Map.entry(OrderStatus.ACEITE, OrderStatus.RECUSADA),
            java.util.Map.entry(OrderStatus.EM_PREPARACAO, OrderStatus.PRONTA),
            java.util.Map.entry(OrderStatus.PRONTA, OrderStatus.CONCLUIDA)
        );
        java.util.List<org.junit.jupiter.params.provider.Arguments> args = new java.util.ArrayList<>();
        for (OrderStatus from : OrderStatus.values()) {
            for (OrderStatus to : OrderStatus.values()) {
                boolean esperado = validas.contains(java.util.Map.entry(from, to));
                args.add(org.junit.jupiter.params.provider.Arguments.of(from, to, esperado));
            }
        }
        return args.stream();
    }

    // --- assertValidLojaTransition lanca ServiceException -------------------

    @Test
    void assertValidLojaTransition_lancaServiceException_paraTransicaoInvalida() {
        assertThatThrownBy(() -> OrderStateMachine.assertValidLojaTransition(OrderStatus.PENDENTE, OrderStatus.CONCLUIDA))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA030_INVALID_ORDER_TRANSITION);
    }

    @Test
    void assertValidLojaTransition_lancaServiceException_paraTransicaoParaCancelada() {
        assertThatThrownBy(() -> OrderStateMachine.assertValidLojaTransition(OrderStatus.PENDENTE, OrderStatus.CANCELADA))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA030_INVALID_ORDER_TRANSITION);
    }

    @Test
    void assertValidLojaTransition_lancaServiceException_apartirDeEstadoTerminal() {
        assertThatThrownBy(() -> OrderStateMachine.assertValidLojaTransition(OrderStatus.CONCLUIDA, OrderStatus.PENDENTE))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA030_INVALID_ORDER_TRANSITION);
    }
}
