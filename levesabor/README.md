# Leve Sabor AI — Implementação

Monorepo de implementação. Toda a documentação de referência vive em [`../docs/plano/`](../docs/plano/):
o quadro de tarefas é o [`tasks.md`](../docs/plano/tasks.md) (**frontend primeiro, backend depois**).

```
levesabor/
├── levesabor-web/    # Frontend — Next.js (App Router) + PWA · arquitetura: docs/plano/02-ui-ux-plan.md §5
├── levesabor-api/    # Backend — Java 17 · Spring Boot 3 · Maven · arquitetura: docs/plano/03-backend-plan.md §2
└── docker-compose.dev.yml   # Postgres local para desenvolvimento
```

## Arranque rápido

```bash
# Base de dados local
docker compose -f docker-compose.dev.yml up -d

# Frontend (fase atual — desenvolve contra mocks MSW, cartões MOCK-01..03)
cd levesabor-web && npm install && npm run dev      # http://localhost:3000

# Backend (fase seguinte)
cd levesabor-api && mvn spring-boot:run             # http://localhost:8080/api/v1
```

## Convenções

- Cada ficheiro stub tem no topo o **ID do cartão** do `tasks.md` (ex.: `FE-C03`) e a referência ao plano.
- Imagens/ilustrações: cada pasta em `levesabor-web/public/images/*/` contém um `PROMPT.md` pronto a colar no ChatGPT para gerar o asset — ver `docs/plano/02-ui-ux-plan.md §4`.
- Segredos só em variáveis de ambiente (`.env.local` no web, env vars no api) — nunca versionados.
