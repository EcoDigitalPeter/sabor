package mz.levesabor.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * BE-A01 · Entrada da aplicação.
 * @EnableAsync: geração de planos por IA é assíncrona (BE-C03).
 * @EnableJpaAuditing: created_at/updated_at automáticos no BaseEntity (BE-A02).
 */
@SpringBootApplication
@EnableAsync
@EnableJpaAuditing
public class LeveSaborApplication {
    public static void main(String[] args) {
        SpringApplication.run(LeveSaborApplication.class, args);
    }
}
