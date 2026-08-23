# Checklist de ambientes — CORS e variáveis por deploy

> Nasceu de dois tropeços reais numa sessão de validação (23/08/2026): CORS bloqueado contra `localhost:3000` e só depois confirmado OK para o domínio Vercel, ambos por `APP_CORS_ORIGINS` mal configurado na Railway. Existe para não se ter de redescobrir isto a cada novo ambiente.

## 1. Tabela de ambientes

| Ambiente | `NEXT_PUBLIC_API_URL` (frontend) | Origin a incluir em `APP_CORS_ORIGINS` (Railway) |
|---|---|---|
| Dev local (`npm run dev`, porta 3000) | `http://localhost:8080/api/v1` (backend local) **ou** `https://ottimizo-production.up.railway.app/api/v1` (backend Railway) | `http://localhost:3000` |
| Vercel — produção (domínio fixo em Settings → Domains) | `https://ottimizo-production.up.railway.app/api/v1` | `https://<domínio-fixo>.vercel.app` |
| Vercel — preview (URL por PR/branch, varia a cada deploy) | idem produção | sem wildcard suportado (ver §3) — adicionar cada URL à mão, ou testar sempre contra o domínio fixo de produção |

`NEXT_PUBLIC_USE_MOCKS` tem de ser `false` em qualquer ambiente que aponte a um backend real (local ou Railway); `true` só faz sentido em dev contra MSW ou nos testes E2E (`e2e/*.spec.ts`, que correm sempre contra mocks — ver `docs/plano/09-plano-testes-feedback-cliente.md`).

## 2. Onde mexer

- **Frontend (Vercel):** Project Settings → Environment Variables → `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_USE_MOCKS`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Aplicar a Production + Preview conforme o ambiente.
- **Frontend (local):** `levesabor-web/.env.local` (nunca commitado — copiar de `.env.example`).
- **Backend (Railway):** Variables → `APP_CORS_ORIGINS` (lista separada por vírgulas, sem espaços à volta — `SecurityConfig.corsConfigurationSource` faz `trim()` em cada item, mas manter limpo). Gravar a variável dispara redeploy automático.

## 3. Limitação conhecida — sem wildcard de CORS

`ottimizo/src/main/java/com/ottimizo/common/security/SecurityConfig.java:70-84` usa `CorsConfiguration.setAllowedOrigins(...)` com a lista literal de `APP_CORS_ORIGINS` — **não há suporte a wildcard de subdomínio** (ex. `https://*.vercel.app` não funciona; o Spring exigiria `setAllowedOriginPatterns` para isso, que não está em uso). Cada novo domínio de preview do Vercel tem de ser adicionado manualmente à variável, ou a equipa fixa um único domínio de produção (Vercel → Settings → Domains) e testa sempre contra esse, evitando o problema.

## 4. Diagnóstico rápido

Testar CORS para um origin específico sem abrir o browser:

```bash
curl -s -m 10 -D - -o /dev/null -X OPTIONS \
  -H "Origin: https://<domínio-a-testar>" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  https://ottimizo-production.up.railway.app/api/v1/stores
```

- `HTTP/2 200` + header `access-control-allow-origin: <o mesmo origin>` → CORS OK para esse domínio.
- `HTTP/2 403` sem headers `access-control-*` → origin não está em `APP_CORS_ORIGINS` na Railway — corrigir e aguardar o redeploy automático antes de repetir.

Testar saúde do backend em si (sem CORS, útil para isolar "backend em baixo" de "CORS mal configurado"):

```bash
curl -s -m 10 -o /dev/null -w "HTTP:%{http_code}\n" https://ottimizo-production.up.railway.app/actuator/health
```
