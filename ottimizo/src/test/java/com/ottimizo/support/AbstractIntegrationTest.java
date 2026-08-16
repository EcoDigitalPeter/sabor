package com.ottimizo.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Classe base para testes de integracao de BE-C/BE-D/BE-E/BE-L em diante.
 *
 * <p>Sobe um Postgres real em Testcontainers e liga o Spring Boot a ele via
 * {@code @ServiceConnection} — o Flyway corre as migracoes reais
 * (V001..V00N, {@code src/main/resources/db/migration}) contra essa base de
 * dados antes de cada classe de teste que estenda esta base, tal como em
 * producao. Nao mockar o schema aqui: se uma migracao futura quebrar algo
 * que um teste de integracao dependa, este e o sitio onde isso se ve.
 *
 * <p>Requer Docker (ou um daemon compativel, ex. Docker Desktop / Colima) a
 * correr na maquina/CI que executar estes testes — sem ele, o arranque do
 * container falha antes mesmo do Spring context subir.
 *
 * <p>Subclasses tipicas usam {@code @AutoConfigureMockMvc} para exercitar os
 * controllers com pedidos HTTP simulados sobre esta base de dados real.
 */
@Testcontainers
@SpringBootTest
public abstract class AbstractIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"));
}
