package com.ottimizo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * {@code @EnableAsync} liga o processamento em segundo plano de
 * {@code AiMealPlanService#generateAsync} (BE-C03) — sem isto o Spring
 * ignora silenciosamente a anotacao {@code @Async} e corre tudo de forma
 * sincrona no thread do pedido.
 */
@EnableJpaAuditing
@EnableAsync
@SpringBootApplication
public class OttimizoApplication {

    public static void main(String[] args) {
        SpringApplication.run(OttimizoApplication.class, args);
    }
}
