# 08 — Plano de colaboradores digitais (QUADRO OS)

> QUADRO OS instalado neste projecto em 2026-08-06 (`.quadro/quadro.db`, empresa "Ottimizzo", supervisor humano "Peter"). Este documento propõe o quadro de colaboradores digitais a contratar via `/quadro:contratar`, e o plano de configuração para os pôr a trabalhar no backlog real de `tasks.md`.

## 0. Decisões de base

- **Acesso a skills/plugins/tools:** a ficha gerada por `modelo-colaborador.md` não define nenhuma lista de ferramentas permitidas (não há campo `tools:` restritivo no frontmatter) — cada colaborador herda, por omissão, o mesmo acesso a skills, plugins, tools e MCP servers que a sessão actual do projecto tem. **Não é preciso configuração extra** para isto; é o comportamento por omissão do QUADRO OS. Só restringir explicitamente se um colaborador concreto vier a precisar de menos superfície (não é o caso hoje).
- **Supervisor humano:** todos os colaboradores propostos reportam a **Peter**, único supervisor registado. Se surgir um segundo supervisor, distribuir por área (ex.: backend vs. loja) nessa altura.
- **Estado inicial:** todos entram como `experimental` (30 dias), conforme regra do `/quadro:contratar` — normal, não mudar.
- **Fonte da verdade do trabalho:** `docs/plano/tasks.md` (quadro Trello) e `docs/plano/05-implementation-roadmap.md` (fases/sprints/orçamento). Os colaboradores não substituem esse quadro — trabalham a partir dele.

## 1. Quadro proposto

| # | Vaga | Departamento | Gatilho de contratação | Responsabilidades-chave (áreas do backlog) | Métrica de partida sugerida |
|---|------|---------------|-------------------------|----------------------------------------------|------------------------------|
| 1 | **Desenvolvedor de Backend** | Engenharia | Já — é o maior gap actual (quase todo `BE-*` por fazer) | `BE-B` (auth/RBAC), `BE-C` (domínio cliente), `BE-D`/`BE-E` (domínio admin), `BE-F` (métricas) — Route Handlers Next.js + Prisma, conforme `03-backend-plan.md` | Nº de endpoints `BE-*` fechados / semana (hoje: 0) |
| 2 | **Especialista de Base de Dados** | Engenharia | Já — desbloqueia todo o `BE-*` (`DB-02`, `DB-03`, `DB-05` são dependências) | `DB-*`: schema Prisma, migrações, RBAC ao nível de tabela, seeds, plano de backup (`04-database-plan.md`) | Nº de migrações aplicadas sem rollback (hoje: 0) |
| 3 | **Engenheiro de Integração/QA** | Engenharia | Ao fechar o 1º domínio `BE-*` (para não ter nada para ligar) | `INT-01..06`: desligar MSW, ligar FE↔BE real, corrigir divergências de contrato, correr `e2e/*.spec.ts`, checklist de entrega por fase | Nº de specs Playwright verdes contra backend real (hoje: 0, tudo contra mocks) |
| 4 | **Manutenção Frontend (Cliente/Admin/Loja)** | Produto/Frontend | Já — há cartões `Em curso` (`FE-D02/D03/D06/D07`) por fechar, mais a ronda `FE-Y01..Y09` (Portal Cliente) | Fecha o que está `Em curso` em Admin, depois `FE-L*` (Fase 3, Portal da Loja) quando `BE-L01` estiver pronto — **e, desde 2026-08-06, a ronda de feedback `FE-Y01..Y09` do Portal Cliente** (âmbito ampliado em vez de nova vaga, ver `.claude/agents/manutencao-frontend.md`) | Nº de cartões `FE-D*`/`FE-L*`/`FE-Y*` movidos para "Concluído" |
| 5 | **Revisor de Copy e Marca** | Produto | Antes de cada release/UAT, e sempre que um label mudar | Aplica `06-guia-de-copy-e-marca.md`; garante que os 4 objetivos e as 4 condições de saúde ficam byte-idênticos em todo o app; grep ao repo inteiro antes de dar um label como fechado (não há i18n central) | Nº de strings divergentes encontradas por ronda de revisão (baixar para 0) |
| 6 | **Ops de Deploy/Release** | Operações | A partir do fim da Fase 1 (`INT-02`) | Checklists de entrega por fase (`05 §4`), variáveis de ambiente por ambiente, verificação de restore de backup antes de `INT-04`, UAT | Nº de deploys sem rollback em produção (hoje: n/a) |

| 7 | **Especialista de UI/UX** | Produto/Design | 2026-08-06 — gap encontrado na ronda `FE-Y` (nenhum colaborador dono dos skills `ui-ux-pro-max`/`impeccable`/`redesign-existing-projects`) | Dono dos skills de design; valida tokens/contraste/tipografia; emite parecer obrigatório sobre qualquer alteração de UI **antes** do Manutenção Frontend commitar (regra de bloqueio, ver `.claude/agents/manutencao-frontend.md` §Precedência e §Limites) | Nº de pareceres emitidos (hoje: 0) |

**Não incluído agora (adiar):** vaga dedicada a IA/prompts de geração de receitas — `07-prompts-ilustracoes-gaps.md` já cobre isso como gap de conteúdo, não de processo; revisitar só se o volume de prompts a ajustar justificar um colaborador fixo.

## 2. Sequenciamento (alinhado a `05-implementation-roadmap.md`)

```
Fase 1 (Portal Cliente):
  Especialista BD  ──▶  Desenvolvedor Backend  ──▶  Eng. Integração/QA  ──▶  Ops Deploy (INT-02)
                                     ▲
  Manutenção Frontend (paralelo, cartões "Em curso")
  Revisor de Copy (paralelo, antes de UAT)

Fase 2 (Portal Admin): mesmos colaboradores, novo lote de tarefas BE-D/BE-E/BE-F + INT-03/04
Fase 3 (Portal Loja): BE-L exige BE-L01 (RBAC LOJISTA) primeiro — usar campo `precedencia`
                       da ficha do Desenvolvedor de Backend para bloquear BE-L02/03/04
                       até BE-L01 estar `ok`.
```

Isto mapeia directamente para o campo `precedencia` da ficha (`agents/modelo-colaborador.md` §Precedência) — só precisa de ser declarado à mão para a dependência real da Fase 3 (`BE-L01` antes de `BE-L02/03/04`); as restantes dependências (`DB` antes de `BE`, `BE` antes de `INT`) já ficam implícitas na ordem de contratação e não precisam de automação.

## 3. Plano de implementação/configuração — passo a passo

1. **Contratar por ordem de dependência**, um de cada vez, via `/quadro:contratar` (skill entrevista, uma pergunta por vez):
   1. Especialista de Base de Dados
   2. Desenvolvedor de Backend
   3. Engenheiro de Integração/QA
   4. Manutenção Frontend (Admin/Loja)
   5. Revisor de Copy e Marca
   6. Ops de Deploy/Release
2. Para cada entrevista, ter pronto antes de começar (evita hesitação a meio):
   - **Nome da vaga** — usar exactamente os nomes da tabela §1 (ficam consistentes no painel).
   - **Departamento** — coluna "Departamento" da tabela §1.
   - **Supervisor** — "Peter" em todos.
   - **Responsabilidades (5–7)** — derivar dos IDs de `tasks.md` listados na coluna "Responsabilidades-chave"; abrir `tasks.md` e copiar os títulos dos cartões relevantes, não inventar texto novo.
   - **Limites explícitos (≥3)** — por norma: não decide fora do âmbito do domínio atribuído; não faz deploy sem checklist assinada; não altera contratos de API sem o `03-backend-plan.md`/OpenAPI; não escreve copy fora do `06-guia-de-copy-e-marca.md`.
   - **Ferramentas/conectores** — "as do projecto" (sem lista fechada — ver decisão §0).
   - **Métrica de HOJE** — usar a coluna "Métrica de partida sugerida" da tabela §1 (todas já têm valor de partida, cumprindo a regra obrigatória da entrevista).
3. **Depois de cada contratação**, confirmar no painel (`http://127.0.0.1:4317`) que a ficha entrou em `experimental` e que o link aparece — o próprio `/quadro:contratar` mostra isto no fim.
4. **Editar `.claude/agents/<id>.md` à mão só para o caso avançado** identificado em §2: acrescentar `precedencia` no ficheiro do Desenvolvedor de Backend para que `BE-L02/03/04` esperem por `BE-L01`. Não mexer nos outros campos avançados (`gatilhos`, `orçamento`, `escalonamento`) — os valores por omissão (despacho manual, limites razoáveis) servem para todos os seis.
5. **Revisitar o quadro no início de cada fase** (Fase 2 e Fase 3): confirmar que as responsabilidades de cada ficha ainda cobrem o lote de tarefas da fase (editar a secção "Responsabilidades" do ficheiro se o âmbito mudou), sem recriar a vaga.
6. **Fim do período experimental (30 dias):** usar `kpis` registados na contratação vs. valor actual para decidir se a vaga passa a permanente ou é ajustada — isto já é o fluxo nativo do QUADRO OS, não precisa de passo extra aqui.

## 4. Riscos específicos deste quadro

| Risco | Mitigação |
|---|---|
| Seis colaboradores em simultâneo sobre um único repo pequeno → conflitos de edição | Contratar e activar por ordem (§3.1), não em paralelo; o campo `supervisor` garante que Peter vê toda a fila de aprovações num só sítio |
| Eng. Integração/QA sem nada para ligar (backend ainda vazio) | Só contratar depois do 1º domínio `BE-*` fechado (gatilho já reflectido na tabela §1) |
| Revisor de Copy a divergir do `06-guia-de-copy-e-marca.md` por não ter lido a versão mais recente | Responsabilidade explícita na ficha: reler o guia antes de cada ronda, não confiar em memória de rondas anteriores |
