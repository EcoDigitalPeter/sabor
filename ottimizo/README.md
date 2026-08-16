# Ottimizo Backend

Backend Spring Boot para a Ottimizo.

- Group ID: `com.ottimizo`
- Artifact ID: `ottimizo`
- Java: 21
- API base: `/api/v1`
- Base de dados/Auth/Realtime: Supabase

## Desenvolvimento local

```powershell
mvn spring-boot:run
```

Variáveis principais:

- `DATABASE_URL`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_JWKS_URI`
- `APP_CORS_ORIGINS`
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`

## Primeira fatia implementada

- `GET /api/v1/health`: healthcheck básico do backend.
- `GET /api/v1/stores`: lê o perfil do cliente, lê lojas activas da base, usa Spring AI para ordenar as lojas por proximidade provável e guarda cache por cliente/morada.

## Nota de arquitectura

A IA não cria receitas, ingredientes, passos, lojas ou produtos. O backend lê dados curados no Supabase, filtra regras duras em código e usa Spring AI apenas para seleccionar, ordenar ou resumir dados existentes.

## Estado de validação

A compilação Maven deve ser executada assim que o ambiente tiver acesso ao repositório Maven local e à rede:

```powershell
mvn -q -DskipTests package
```
