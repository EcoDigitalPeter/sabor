package com.ottimizo.users;

/**
 * Ponto de extensao para revogar, do lado do Supabase Auth, a sessao de um
 * utilizador que acabou de ser suspenso administrativamente (BE-B03).
 *
 * <p>So existe uma implementacao neste momento — {@link NoopSupabaseSessionRevoker}
 * — porque revogar sessoes de facto exige a Supabase Admin API com a
 * service-role key, e essa key ainda nao esta configurada/decidida para
 * este projecto (decisao de seguranca fora do ambito deste colaborador,
 * ver {@code desenvolvedor-backend.md} secao "Limites"). Quando a key
 * existir, adicionar uma implementacao concreta (ex. via {@code RestClient}
 * contra {@code /auth/v1/admin/users/{id}/logout}) e trocar o bean usado em
 * producao.
 */
public interface SupabaseSessionRevoker {

    void revoke(String authUserId);
}
