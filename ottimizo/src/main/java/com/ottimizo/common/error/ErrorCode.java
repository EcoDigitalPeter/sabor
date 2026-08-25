package com.ottimizo.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    LSA001_VALIDATION(HttpStatus.BAD_REQUEST, "Dados invalidos."),
    LSA002_INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Credenciais invalidas."),
    LSA003_ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "Conta suspensa. Contacta o suporte."),
    LSA004_FORBIDDEN(HttpStatus.FORBIDDEN, "Sem permissao para esta operacao."),
    LSA005_NOT_FOUND(HttpStatus.NOT_FOUND, "Recurso nao encontrado."),
    LSA006_DUPLICATE(HttpStatus.CONFLICT, "Recurso duplicado."),
    LSA007_STORE_OWNERSHIP(HttpStatus.FORBIDDEN, "Esta loja nao pertence a tua conta."),
    LSA008_UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Sessao invalida ou expirada. Inicia sessao novamente."),
    LSA010_PROFILE_INCOMPLETE(HttpStatus.CONFLICT, "Completa o teu perfil antes de gerar um plano."),
    LSA011_GENERATION_IN_PROGRESS(HttpStatus.CONFLICT, "Ja existe uma geracao em curso."),
    LSA012_GENERATION_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "Limite diario de geracoes atingido."),
    LSA013_AI_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "Nao foi possivel gerar o plano. Tenta novamente."),
    LSA014_NO_ALTERNATIVE(HttpStatus.CONFLICT, "Sem alternativa disponivel para as tuas restricoes."),
    LSA015_ADHOC_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "Limite diario de pedidos avulsos atingido."),
    LSA016_STORE_INACTIVE(HttpStatus.CONFLICT, "Esta loja nao esta disponivel para encomendas."),
    LSA017_ORDER_NOT_CANCELABLE(HttpStatus.CONFLICT, "Esta encomenda ja nao pode ser cancelada."),
    LSA018_INSUFFICIENT_CATALOG(HttpStatus.CONFLICT, "Ainda nao ha receitas suficientes para este perfil."),
    LSA020_IMPORT_INVALID_FILE(HttpStatus.BAD_REQUEST, "Ficheiro invalido."),
    LSA021_INGREDIENT_IN_USE(HttpStatus.CONFLICT, "Ingrediente em uso."),
    LSA022_LAST_ADMIN(HttpStatus.CONFLICT, "Tem de existir pelo menos um administrador activo."),
    LSA023_RECIPE_INCOMPLETE(HttpStatus.CONFLICT, "Receita incompleta."),
    LSA024_STORE_IN_USE(HttpStatus.CONFLICT, "Esta loja tem lojistas ou encomendas associadas e nao pode ser removida."),
    LSA025_IMAGE_GENERATION_FAILED(HttpStatus.BAD_GATEWAY, "Nao foi possivel gerar a imagem. Tenta novamente."),
    LSA030_INVALID_ORDER_TRANSITION(HttpStatus.CONFLICT, "Transicao de estado invalida."),
    LSA031_IMPORT_ALREADY_PROCESSED(HttpStatus.CONFLICT, "Este import ja foi aplicado ou nao esta valido para confirmar."),
    LSA099_INTERNAL(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno. A equipa foi notificada.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus status() {
        return status;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
