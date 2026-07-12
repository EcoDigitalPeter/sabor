package mz.levesabor.api.exceptions;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * BE-A02 · Catálogo de erros LSAxxx — padrão do irc-container (enum + mensagens printf),
 * definido em docs/plano/03-backend-plan.md §3.2. Mensagens em pt-PT, prontas a mostrar na UI.
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCodes {
    LSA001_VALIDATION("Dados inválidos: %s", 400),
    LSA002_INVALID_CREDENTIALS("Credenciais inválidas", 401),
    LSA003_ACCOUNT_SUSPENDED("Conta suspensa — contacta o suporte", 403),
    LSA004_FORBIDDEN("Sem permissão para esta operação", 403),
    LSA005_NOT_FOUND("%s não encontrado", 404),
    LSA006_DUPLICATE("%s já existe", 409),
    LSA010_PROFILE_INCOMPLETE("Completa o teu perfil antes de gerar um plano", 409),
    LSA011_GENERATION_IN_PROGRESS("Já existe uma geração em curso", 409),
    LSA012_GENERATION_LIMIT("Limite diário de gerações atingido", 429),
    LSA013_AI_UNAVAILABLE("Não foi possível gerar o plano — tenta novamente", 502),
    LSA014_NO_ALTERNATIVE("Sem alternativa disponível para as tuas restrições", 409),
    LSA020_IMPORT_INVALID_FILE("Ficheiro inválido: %s", 400),
    LSA021_INGREDIENT_IN_USE("Ingrediente usado em %d receitas — desativa em vez de remover", 409),
    LSA022_LAST_ADMIN("Tem de existir pelo menos um administrador ativo", 409),
    LSA023_RECIPE_INCOMPLETE("Receita não publicável: %s", 409),
    LSA099_INTERNAL("Erro interno — a equipa foi notificada", 500);

    private final String template;
    private final int httpStatus;

    public String getMessage(Object... args) {
        return String.format(template, args);
    }
}
