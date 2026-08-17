package com.ottimizo.users;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Implementacao provisoria de {@link SupabaseSessionRevoker} (BE-B03,
 * decisao 2026-08-17): a suspensao de um utilizador so aplica {@code
 * status=SUSPENDED} localmente. A sessao Supabase correspondente NAO e
 * revogada — isso exigiria a Supabase Admin API com a service-role key,
 * que ainda nao esta configurada/decidida para este projecto, pelo que
 * construir aqui um cliente HTTP generico para essa API seria
 * infraestrutura sem forma de ser testada. Ver javadoc de
 * {@link SupabaseSessionRevoker} para o plano de substituicao.
 */
@Component
public class NoopSupabaseSessionRevoker implements SupabaseSessionRevoker {

    private static final Logger log = LoggerFactory.getLogger(NoopSupabaseSessionRevoker.class);

    @Override
    public void revoke(String authUserId) {
        log.warn(
            "Supabase service-role key nao configurada — sessao nao invalidada remotamente, "
                + "so suspensao local aplicada. authUserId={}",
            authUserId
        );
    }
}
