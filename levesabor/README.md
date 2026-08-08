# Ottimizo — Implementação

Monorepo de implementação. Toda a documentação de referência vive em [`../docs/plano/`](../docs/plano/):
o quadro de tarefas é o [`tasks.md`](../docs/plano/tasks.md) (**frontend primeiro, backend depois**).

```
levesabor/
├── levesabor-web/    # Next.js (App Router) + PWA, fullstack — arquitetura: docs/plano/README.md §5
└── docker-compose.dev.yml   # Postgres local para desenvolvimento
```

**Mudança de plano (documentada em `docs/plano/README.md` §5):** deixou de existir um serviço de backend Java/Spring Boot separado (`levesabor-api`) — o backend vive dentro do próprio projeto Next.js (Route Handlers em `levesabor-web/src/app/api/`), para permitir um único deploy no Vercel.

## Arranque rápido

```bash
# Base de dados local
docker compose -f docker-compose.dev.yml up -d

# App (fase atual — frontend desenvolve contra mocks MSW, cartões MOCK-01..03;
# as rotas de backend em src/app/api/ ainda estão por construir, ver secção BE-* do tasks.md)
cd levesabor-web && npm install && npm run dev      # http://localhost:3000
```

## Convenções

- Cada ficheiro stub tem no topo o **ID do cartão** do `tasks.md` (ex.: `FE-C03`) e a referência ao plano.
- Imagens/ilustrações: cada pasta em `levesabor-web/public/images/*/` contém um `PROMPT.md` pronto a colar no ChatGPT para gerar o asset — ver `docs/plano/02-ui-ux-plan.md §4`.
- Segredos só em variáveis de ambiente (`.env.local` no web, env vars no api) — nunca versionados.
