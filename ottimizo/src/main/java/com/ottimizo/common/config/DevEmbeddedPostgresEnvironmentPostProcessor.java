package com.ottimizo.common.config;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * DB-06: arranca um Postgres embutido/em processo (io.zonky.test:embedded-postgres) quando o
 * perfil Spring "dev" esta activo, e aponta {@code spring.datasource.*} para ele antes do
 * Flyway/JPA arrancarem — sem Docker, sem Testcontainers, sem configuracao manual de
 * connection string. So corre neste perfil; qualquer outro perfil (default, test, prod) fica
 * inalterado porque a dependencia so esta no classpath, nunca activa nenhum bean sozinha.
 *
 * <p>Registado via {@code META-INF/spring/org.springframework.boot.env.EnvironmentPostProcessor.imports}
 * em vez de uma {@code @Configuration}, porque o datasource tem de estar definido ANTES do
 * arranque do contexto Spring (que e quando o Flyway/DataSource autoconfiguration correm) —
 * um {@code @Bean} normal seria tarde de mais.
 *
 * <p>A instancia embutida fica viva para a duracao do processo (holder estatico); um shutdown
 * hook liberta os ficheiros temporarios do binario do Postgres ao terminar a app.
 */
public class DevEmbeddedPostgresEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static volatile EmbeddedPostgres embedded;

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (!environment.acceptsProfiles(org.springframework.core.env.Profiles.of("dev"))) {
            return;
        }

        EmbeddedPostgres instance = startOnce();

        Map<String, Object> devDatasourceProps = new LinkedHashMap<>();
        devDatasourceProps.put("spring.datasource.url", "jdbc:postgresql://localhost:" + instance.getPort() + "/postgres");
        devDatasourceProps.put("spring.datasource.username", "postgres");
        devDatasourceProps.put("spring.datasource.password", "postgres");

        environment.getPropertySources().addFirst(new MapPropertySource("dev-embedded-postgres", devDatasourceProps));
    }

    private static synchronized EmbeddedPostgres startOnce() {
        if (embedded == null) {
            try {
                embedded = EmbeddedPostgres.builder().start();
            } catch (IOException e) {
                throw new UncheckedIOException(
                    "DB-06: falha ao arrancar o Postgres embutido do perfil dev — "
                        + "verifica se ha espaco em disco/permissoes para extrair os binarios "
                        + "em ~/.embedded-postgres-binaries.",
                    e
                );
            }
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    embedded.close();
                } catch (IOException ignored) {
                    // best-effort na paragem do processo dev
                }
            }));
        }
        return embedded;
    }

    /**
     * Corre logo a seguir a resolucao de configuracao/perfis (application.yml,
     * application-dev.yml, -Dspring-boot.run.profiles, SPRING_PROFILES_ACTIVE, ...) para que
     * {@code environment.acceptsProfiles} reflicta o perfil "dev" correctamente, mas ainda
     * bem antes do DataSource autoconfiguration do Spring Boot ler spring.datasource.url.
     */
    @Override
    public int getOrder() {
        return ConfigDataEnvironmentPostProcessor.ORDER + 1;
    }
}
