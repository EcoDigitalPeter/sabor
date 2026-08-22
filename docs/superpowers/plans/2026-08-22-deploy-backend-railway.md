# Deploy do Backend Ottimizo no Railway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar o backend Spring Boot (`ottimizo/`) no Railway como serviço próprio, ligado ao Supabase de produção já configurado (`fdbgtfafynvteakamkuf`), com deploy automático a partir do GitHub e um smoke test pós-deploy que confirma login + endpoint autenticado a funcionar (o mesmo par de verificações usado ao longo desta sessão de debug local).

**Architecture:** O Railway não faz build nativo de Maven sem um `Dockerfile` neste projecto (confirmado: sem `mvnw`, sem `railway.json` existente) — por isso o deploy usa um `Dockerfile` multi-stage (build Maven + runtime JRE), com o Railway a ler `ottimizo/` como *root directory* dentro do monorepo (`sabor` tem `levesabor/` e `ottimizo/` lado a lado). As variáveis de ambiente do perfil `prod` (`application-prod.yml`) não têm defaults — arranque falha rápido se faltar alguma, o que é o comportamento desejado para produção (evita ligar a um sítio errado silenciosamente). O `server.port` já lê `${PORT:8080}`, que é exactamente a variável que o Railway injecta — não precisa de alteração.

**Tech Stack:** Docker (multi-stage build: `maven:3.9-eclipse-temurin-17` para build, `eclipse-temurin:17-jre-alpine` para runtime — Java 17, o que o `pom.xml` já fixa via `<java.version>17</java.version>`, apesar de `CLAUDE.md`/docs mencionarem "Java 21" nalguns sítios — discrepância pré-existente, fora de âmbito corrigir aqui; o build usa o que o `pom.xml` realmente pede), Railway (deploy via GitHub, builder Dockerfile), Spring Boot Actuator (`/actuator/health` já exposto, usado como healthcheck).

**Spec:** `docs/plano/README.md:81-84` (decisão arquitectural: frontend no Vercel, backend Spring Boot como serviço à parte — este plano escolhe Railway como esse serviço, por pedido explícito nesta conversa).

## Global Constraints

- Edições directas a ficheiros dentro de `D:\aps\sabor\ottimizo` estão bloqueadas para esta sessão em background (isolamento de worktree). O agente dita o conteúdo exacto de cada ficheiro novo (`Dockerfile`, `.dockerignore`, `railway.json`); o humano (Peter) cria os ficheiros, faz commit/push, e configura o Railway (dashboard ou CLI, que precisam de login interactivo que o agente não tem).
- Nenhuma variável de ambiente com segredo real (password da BD, chave OpenAI/NVIDIA) deve ir para o `Dockerfile` nem para `railway.json` — só para as *environment variables* do serviço no dashboard/CLI do Railway (nunca commitadas).
- CORS: `APP_CORS_ORIGINS` no Railway tem de apontar para o domínio real do frontend em produção (Vercel), não `http://localhost:3000` (o default de dev). Se o domínio Vercel ainda não estiver definido, usar um placeholder e documentar como tarefa de seguimento — não bloquear o deploy do backend por isso.
- Não mudar `SPRING_PROFILES_ACTIVE` para outra coisa que não `prod` — é esse perfil que tem a configuração real do Supabase (`application-prod.yml`); o perfil default (`application.yml`) tem defaults de `localhost` que não fazem sentido em produção.

---

## Task 1: Dockerfile + `.dockerignore`

**Files:**
- Create: `D:\aps\sabor\ottimizo\Dockerfile`
- Create: `D:\aps\sabor\ottimizo\.dockerignore`

**Interfaces:**
- Consumes: `pom.xml` (Maven build, Java 17, `spring-boot-maven-plugin` já configurado para gerar jar executável em `target/*.jar` — confirmado por leitura directa de `pom.xml:127-134`).
- Produces: imagem Docker que expõe a app na porta `$PORT` (lida de `server.port: ${PORT:8080}` em `application.yml:44-45`) — consumida pelo Task 2 (`railway.json`) e pelo próprio Railway (que injecta `PORT` automaticamente em todos os serviços).

- [ ] **Step 1: Criar `.dockerignore`**

  ```
  target/
  .idea/
  *.iml
  .git/
  .gitignore
  *.md
  ```

- [ ] **Step 2: Criar o `Dockerfile` (multi-stage)**

  ```dockerfile
  # Stage 1: build
  FROM maven:3.9-eclipse-temurin-17 AS build
  WORKDIR /app
  COPY pom.xml .
  RUN mvn -q -B dependency:go-offline
  COPY src ./src
  RUN mvn -q -B -DskipTests package

  # Stage 2: runtime
  FROM eclipse-temurin:17-jre-alpine
  WORKDIR /app
  COPY --from=build /app/target/*.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "app.jar"]
  ```

  Nota: `dependency:go-offline` antes de copiar `src/` é só uma optimização de cache de layers Docker (reaproveitar dependências do Maven entre builds quando só o código muda, não o `pom.xml`) — não muda o resultado do build, só acelera builds repetidos no Railway.

- [ ] **Step 3: Build local para validar (opcional mas recomendado antes do primeiro deploy)**

  ```bash
  cd D:/aps/sabor/ottimizo
  docker build -t ottimizo-backend:local .
  ```
  Esperado: build termina sem erro, produz a imagem `ottimizo-backend:local`.

  *(Se não houver Docker instalado localmente, saltar este step — o Railway faz o build no lado dele de qualquer forma; este step é só para apanhar erros de Dockerfile mais cedo.)*

- [ ] **Step 4: Commit**

  ```bash
  cd D:/aps/sabor/ottimizo
  git add Dockerfile .dockerignore
  git commit -m "chore(ottimizo): adiciona Dockerfile multi-stage para deploy no Railway"
  ```

---

## Task 2: Configuração do Railway (`railway.json`) — healthcheck e restart policy

**Files:**
- Create: `D:\aps\sabor\ottimizo\railway.json`

**Interfaces:**
- Consumes: `/actuator/health` (endpoint já exposto — `application.yml:47-55`, `management.endpoints.web.exposure.include: health,info,metrics`), confirmado nesta sessão a responder `{"status":"UP",...}` em `200`.
- Produces: config lida automaticamente pelo Railway ao detectar o ficheiro na raiz do *root directory* do serviço (`ottimizo/`).

- [ ] **Step 1: Criar `railway.json`**

  ```json
  {
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
      "builder": "DOCKERFILE",
      "dockerfilePath": "Dockerfile"
    },
    "deploy": {
      "healthcheckPath": "/actuator/health",
      "healthcheckTimeout": 100,
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 3
    }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd D:/aps/sabor/ottimizo
  git add railway.json
  git commit -m "chore(ottimizo): configura healthcheck e restart policy do Railway"
  ```

---

## Task 3: Criar o serviço no Railway e ligar ao GitHub

**Files:** nenhum ficheiro do repositório — configuração feita no dashboard/CLI do Railway (conta pessoal do Peter, fora do alcance do agente).

**Interfaces:**
- Consumes: repositório GitHub `EcoDigitalPeter/sabor` (confirmado via `git remote -v`), branch a implantar (recomendado: `master`, ou a branch que ficar definida como produção depois do merge do trabalho actual em `quadro/be-a04`).
- Produces: um URL público `https://<nome-do-servico>.up.railway.app` (ou domínio próprio, se configurado depois) — consumido pelo Task 4 (variáveis de ambiente do próprio serviço, ex. `APP_CORS_ORIGINS` do lado do frontend) e pelo Task 5 (smoke test).

- [ ] **Step 1: Criar novo projecto no Railway ligado ao GitHub**

  No dashboard do Railway (railway.app): **New Project → Deploy from GitHub repo → `EcoDigitalPeter/sabor`**.

- [ ] **Step 2: Definir o *Root Directory* do serviço como `ottimizo`**

  Nas definições do serviço criado: **Settings → Root Directory → `ottimizo`**. Isto é essencial — sem isto o Railway tenta fazer build do monorepo inteiro (incluindo `levesabor/`, que é um projecto Next.js separado) a partir da raiz errada.

- [ ] **Step 3: Confirmar que o builder detectado é "Dockerfile"**

  Com `railway.json` (Task 2) e `Dockerfile` (Task 1) já commitados e no root directory correcto, o Railway deve detectar automaticamente `"builder": "DOCKERFILE"`. Confirmar em **Settings → Build** que aparece o `Dockerfile` de `ottimizo/` e não um builder Nixpacks genérico.

- [ ] **Step 4: Definir a branch de deploy**

  **Settings → Deploy Triggers** — escolher a branch (`master`, assumindo que o trabalho actual em `quadro/be-a04` já foi mesclado; se ainda não foi, apontar temporariamente para `quadro/be-a04` e mudar para `master` depois do merge).

---

## Task 4: Variáveis de ambiente de produção no Railway

**Files:** nenhum — variáveis definidas em **Settings → Variables** do serviço no Railway (nunca commitadas no repositório).

**Interfaces:**
- Consumes: os mesmos nomes de variável que `application-prod.yml` já espera (`SPRING_PROFILES_ACTIVE`, `SUPABASE_DB_URL`, `SUPABASE_DB_USERNAME`, `SUPABASE_DB_PASSWORD`, `SUPABASE_JWT_ISSUER`, `SUPABASE_JWKS_URI`, `APP_CORS_ORIGINS`, `OPENAI_API_KEY`) — confirmados por leitura directa de `application-prod.yml:87-103` e `application.yml:57-61` nesta sessão. Os mesmos valores já usados no run config local do IntelliJ (`.idea/workspace.xml`) servem de referência directa, excepto `APP_CORS_ORIGINS` (tem de mudar de `localhost:3000` para o domínio Vercel real) e a password da BD (recomendo rodar antes de reusar — ver nota de segurança abaixo).
- Produces: nenhuma interface de código — consumido apenas pelo runtime da app no arranque (`@ConfigurationProperties`/`${...}` resolution do Spring Boot).

- [ ] **Step 1: Definir as variáveis obrigatórias**

  No Railway, **Settings → Variables**, adicionar uma por uma:

  | Variável | Valor |
  |---|---|
  | `SPRING_PROFILES_ACTIVE` | `prod` |
  | `SUPABASE_DB_URL` | `jdbc:postgresql://aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0&readOnlyMode=ignore` |
  | `SUPABASE_DB_USERNAME` | `postgres.fdbgtfafynvteakamkuf` |
  | `SUPABASE_DB_PASSWORD` | *(a password real da BD Supabase — ver nota de segurança abaixo antes de reusar a mesma do dev local)* |
  | `SUPABASE_JWT_ISSUER` | `https://fdbgtfafynvteakamkuf.supabase.co/auth/v1` |
  | `SUPABASE_JWKS_URI` | `https://fdbgtfafynvteakamkuf.supabase.co/auth/v1/.well-known/jwks.json` |
  | `APP_CORS_ORIGINS` | domínio real do frontend Vercel (ex. `https://ottimizzo.vercel.app`) — **não** `http://localhost:3000` |
  | `OPENAI_API_KEY` | chave real (OpenAI ou NVIDIA NIM, conforme decisão pendente nesta conversa) |

  Variáveis opcionais (já têm default sensato em `application.yml`, só definir se quiseres outro valor):

  | Variável | Default se omissa |
  |---|---|
  | `OPENAI_BASE_URL` | `https://api.openai.com` |
  | `OPENAI_CHAT_MODEL` | `gpt-4o-mini` |
  | `MEAL_PLAN_DAILY_LIMIT` | `3` |

  **Não definir `PORT`** — o Railway injecta-o automaticamente e a app já lê `${PORT:8080}`.

- [ ] **Step 2: Nota de segurança — rodar a password da BD antes deste deploy**

  A password actual da BD Supabase (`SUPABASE_DB_PASSWORD`) já foi exposta em texto simples nesta conversa e nalguns relatórios anteriores da sessão de testes de integração (`docs/superpowers/plans/2026-08-22-relatorio-testes-integracao-nao-ia-admin-loja.md`, secção "Nota de segurança", já recomendava rodá-la). Antes de a colocar num serviço de produção real como o Railway, recomendo: Supabase dashboard → Project Settings → Database → **Reset database password**, e usar a password nova aqui (e actualizar o run config local do IntelliJ com o valor novo, para não ficar dessincronizado).

---

## Task 5: Deploy e smoke test pós-deploy

**Files:** nenhum ficheiro do repositório.

**Interfaces:**
- Consumes: URL público do serviço Railway (Task 3), gerado automaticamente (**Settings → Networking → Generate Domain**, se ainda não estiver activo).
- Produces: confirmação de que o backend em produção responde a login + endpoint autenticado — o mesmo par de verificações (`/actuator/health`, login Supabase, `GET /api/v1/admin/recipes/{id}`) já usado ao longo desta sessão para validar o backend local, agora repetido contra o URL do Railway.

- [ ] **Step 1: Trigger do primeiro deploy**

  Com Tasks 1-4 completas e commitadas/pushed, o Railway despoleta o deploy automaticamente ao detectar o push na branch configurada (Task 3, Step 4). Acompanhar os logs de build em **Deployments** no dashboard.

- [ ] **Step 2: Gerar domínio público (se ainda não existir)**

  **Settings → Networking → Generate Domain** — produz um URL tipo `https://ottimizo-production.up.railway.app`.

- [ ] **Step 3: Smoke test — health check**

  ```bash
  curl -sS "https://<URL-do-Railway>/actuator/health" -w "\nHEALTH_HTTP:%{http_code}\n"
  ```
  Esperado: `{"status":"UP","groups":["liveness","readiness"]}` com `HEALTH_HTTP:200`.

- [ ] **Step 4: Smoke test — login + endpoint autenticado**

  ```bash
  RESP=$(curl -sS -X POST "https://fdbgtfafynvteakamkuf.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: sb_publishable_FZgyFl-JT1I2weI5XVa4EA_D5IyYKl4" \
    -H "Content-Type: application/json" \
    -d '{"email":"teste.integracao.1787308566098@gmail.com","password":"<PASSWORD-DA-CONTA-DE-TESTE>"}')
  TOKEN=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
  curl -sS -X GET "https://<URL-do-Railway>/api/v1/admin/recipes/1" -H "Authorization: Bearer $TOKEN" -w "\nADMIN_HTTP:%{http_code}\n"
  ```
  Esperado: `ADMIN_HTTP:200` (assumindo que o plano `2026-08-22-fix-lazyinit-recipe-ingredient.md` já foi aplicado — se não, este pedido ainda vai devolver `500 LSA099_INTERNAL`, o que é esperado e não é um problema do deploy em si).

- [ ] **Step 5: Actualizar `base_url` da colecção Postman para apontar ao Railway (opcional, para testes contínuos)**

  Em `D:\aps\sabor\postman\Ottimizo.postman_collection.json`, mudar a variável de colecção `base_url` de `http://localhost:8080` para o URL do Railway — ou, mais simples, criar um **Environment** no Postman (`Local` vs `Railway`) com `base_url` diferente em cada um, mantendo a colecção inalterada. Recomendo a segunda opção (environments), para não perder a capacidade de testar localmente.

## Self-Review (feito ao escrever este plano)

1. **Cobertura:** pedido foi "plano para deploy do backend no Railway" — Task 1 (build), Task 2 (healthcheck/restart), Task 3 (ligação ao repo/root directory do monorepo), Task 4 (env vars reais, com nota de segurança sobre a password já exposta), Task 5 (deploy + validação com os mesmos smoke tests já usados nesta sessão) cobrem o ciclo completo do primeiro deploy.
2. **Placeholders:** os únicos valores por preencher são segredos reais (`SUPABASE_DB_PASSWORD` novo, `OPENAI_API_KEY`, domínio Vercel exacto) — inevitável, são credenciais/decisões que só o Peter tem; tudo o resto (Dockerfile, railway.json, comandos, nomes de variável) está completo e exacto.
3. **Consistência:** nomes de variável de ambiente usados no Task 4 coincidem exactamente com os lidos em `application-prod.yml`/`application.yml` nesta sessão (mesmos nomes já validados a funcionar localmente via `.idea/workspace.xml`).
