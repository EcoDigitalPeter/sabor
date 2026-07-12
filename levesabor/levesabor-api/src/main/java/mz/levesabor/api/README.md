# mz.levesabor.api — mapa de pacotes (docs/plano/03-backend-plan.md §2)

| Pacote | Conteúdo | Cartões |
|---|---|---|
| `config/` | `SecurityConfig` (regras por rota/role §4), `OpenAiConfig`, `AsyncConfig`, `OpenApiConfig` | BE-B01, BE-C03 |
| `security/` | `JwtService`, `JwtAuthFilter` (OncePerRequestFilter), `CurrentUser` | BE-B01/B02 |
| `controller/` | 1 controller por recurso; finos, `@Valid`, sem try/catch; `admin/` com `@PreAuthorize("hasRole('ADMIN')")` | BE-B02, BE-C*, BE-D*, BE-E*, BE-F01 |
| `services/` | Interfaces `I*` + `impl/` (convenção do irc-container); `@Transactional` na fronteira | idem |
| `persist/entity/` | Entidades JPA + `BaseEntity` (@MappedSuperclass, auditing) — colunas snake_case | DB-01..05 |
| `persist/repository/` | Spring Data JPA, 1 por agregado | idem |
| `dto/` | Records + Bean Validation, sub-pacotes por área; `ApiResponse`/`PageResponse` na raiz | todos |
| `exceptions/` | `ErrorCodes` (LSAxxx), `ServiceException`, `GlobalExceptionHandler` | BE-A02 ✔ |
| `utils/` | `UnitConverter` (g↔kg, ml↔l — BE-C06), `ExcelTemplate` (POI — BE-D04), `CorrelationIdFilter` (BE-A02) | — |

Serviço-chave: `services/IAiMealPlanService` + `impl/OpenAiMealPlanService` — fornecedor de IA trocável;
os filtros duros de saúde vivem em `RecipeCatalogService`, **nunca** delegados à LLM (BE-C02/C03).
