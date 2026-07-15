# 01 — Plano Funcional

> Funcionalidades organizadas por persona. Cada funcionalidade tem: descrição, fluxo, regras de negócio, tarefas separadas por equipa (frontend / backend / base de dados), endpoints, validações, estados, critérios de aceitação e prioridade.
>
> **Prioridades**: `MVP` = Fase 1 · `Fase 2` = Portal Admin · `Fase 3` = Portal da Loja + Encomendas · `Futuro` = fora do âmbito atual. Tudo o que é `Futuro` ou não consta explicitamente das 3 fases está marcado **[Sugestão]**.
>
> Endpoints detalhados (payloads, códigos de resposta): [`03-backend-plan.md`](03-backend-plan.md). Tabelas: [`04-database-plan.md`](04-database-plan.md). Telas: [`02-ui-ux-plan.md`](02-ui-ux-plan.md).

---

## Persona 1 — Visitante

**Objetivo principal:** perceber o produto e criar conta para aceder ao portal do cliente.

Funcionalidades: `F1-VIS-01` Registo · `F1-VIS-02` Login · `F1-VIS-03` Recuperação de password **[Sugestão]**.

---

### F1-VIS-01 — Registo de conta

| | |
|---|---|
| **Prioridade** | **MVP** (pré-requisito de "conta e perfil do cliente" na cotação) |
| **Telas** | T-02 Registo |

**Descrição funcional.** O visitante cria uma conta com nome, contacto (email) e password. Após registo entra autenticado e é conduzido ao onboarding do perfil (F1-CLI-01).

**Fluxo do utilizador.**
1. Visitante abre `/registo` (ou clica "Criar conta" no login).
2. Preenche nome, email, password, confirmação de password; aceita o aviso "não substitui aconselhamento médico".
3. Submete → conta criada → sessão iniciada automaticamente → redirecionado para o onboarding do perfil.

**Regras de negócio.**
- Email é único no sistema (case-insensitive).
- Password: mínimo 8 caracteres, pelo menos 1 letra e 1 dígito; guardada com BCrypt (custo ≥ 10).
- Todo o registo self-service cria conta com role `CLIENTE` e estado `ACTIVE`. Contas `ADMIN` são criadas apenas por seed/outro admin.
- O aceite do disclaimer fica registado (timestamp) no perfil.

**Tarefas — Frontend.**
- Página `/registo` com formulário (nome, email, password, confirmação, checkbox de disclaimer).
- Validação client-side espelhando as regras acima; mostrar erros por campo.
- Guardar tokens (access em memória, refresh em cookie httpOnly devolvido pelo backend) e redirecionar para `/onboarding`.

**Tarefas — Backend.**
- `POST /api/v1/auth/register`: valida, verifica unicidade do email, cria `users` + emite par de tokens (mesma resposta do login).
- Rate limiting básico no endpoint (ex.: bucket por IP) **[Sugestão]**.

**Tarefas — Base de dados.**
- Tabela `users` (V1) com `email` único (índice `lower(email)`), `password_hash`, `role`, `status`, `disclaimer_accepted_at`.

**Endpoints.** `POST /api/v1/auth/register`.

**Validações.** Nome 2–120 chars; email formato válido; password conforme regra; confirmação igual; checkbox obrigatória; email não registado (409 se existir).

**Estados possíveis.** Formulário: `idle → submitting → success | error(campo) | error(email_duplicado) | error(rede)`.

**Critérios de aceitação.**
- [ ] Registo com dados válidos cria a conta e entra autenticado sem passo extra.
- [ ] Email duplicado devolve erro claro sem revelar mais informação que o necessário.
- [ ] Password nunca aparece em logs nem em respostas.
- [ ] Após registo, o utilizador aterra no onboarding do perfil.

---

### F1-VIS-02 — Login

| | |
|---|---|
| **Prioridade** | **MVP** |
| **Telas** | T-01 Login |

**Descrição funcional.** Utilizador registado (cliente ou admin) autentica-se com email + password e recebe JWT de acesso (curto) + refresh token (longo). O mesmo login serve os dois portais; o role decide o destino.

**Fluxo do utilizador.**
1. Abre `/login`, preenche email e password, submete.
2. Sucesso: `CLIENTE` → dashboard do plano (`/plano`); `ADMIN` → dashboard admin (`/admin`).
3. Falha: mensagem genérica "credenciais inválidas".

**Regras de negócio.**
- Access token: 15 min. Refresh token: 14 dias, rotativo (cada refresh invalida o anterior), persistido em `refresh_tokens` (hash).
- Conta `SUSPENDED` não autentica (403 com mensagem própria).
- Mensagem de erro não distingue "email não existe" de "password errada".
- Sessão expira silenciosamente → o frontend tenta refresh; se falhar, volta ao login preservando a rota de destino.

**Tarefas — Frontend.**
- Página `/login`; interceptor HTTP que injeta `Authorization: Bearer` e faz refresh automático em 401.
- Guardas de rota por role (`CLIENTE` não entra em `/admin` e vice-versa).

**Tarefas — Backend.**
- `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` (revoga refresh token).
- `JwtService` (emissão/validação com `jose`), guarda de autorização em `middleware.ts`, regras de autorização por rota + role.

**Tarefas — Base de dados.**
- Tabela `refresh_tokens` (V1): hash do token, `user_id`, `expires_at`, `revoked_at`.

**Endpoints.** `POST /api/v1/auth/login` · `POST /api/v1/auth/refresh` · `POST /api/v1/auth/logout`.

**Validações.** Email formato válido; password não vazia; conta ativa.

**Estados possíveis.** `idle → submitting → success | invalid_credentials | suspended | error(rede)`. Sessão: `authenticated | refreshing | expired`.

**Critérios de aceitação.**
- [ ] Login válido devolve tokens e conduz ao portal certo consoante o role.
- [ ] Conta suspensa não entra e vê mensagem própria.
- [ ] Refresh renova a sessão sem interação do utilizador; logout revoga o refresh token.
- [ ] 5 falhas seguidas não bloqueiam a conta no MVP (lockout é **[Sugestão]** Futuro), mas ficam em `audit_log`.

---

### F1-VIS-03 — Recuperação de password **[Sugestão]**

| | |
|---|---|
| **Prioridade** | **Futuro** (não consta da cotação; recomendada para a Fase 2) |
| **Telas** | T-01 Login (link), tela de reset |

**Descrição funcional.** Fluxo "esqueci-me da password" por email com token de uso único. Requer serviço de envio de email (integração externa nova — por isso fora do âmbito cotado).

**Fluxo.** Pedir reset → email com link expirável (30 min) → definir nova password → sessões antigas revogadas.

**Regras de negócio.** Resposta do pedido é sempre 200 (não revela se o email existe); token single-use com hash em BD.

**Tarefas.** FE: 2 telas. BE: `POST /auth/forgot-password`, `POST /auth/reset-password`, integração SMTP/provider. BD: tabela `password_reset_tokens`.

**Validações.** Token válido/não expirado/não usado; password conforme regra.

**Estados.** `idle → sent`; reset: `valid | expired | used | success`.

**Critérios de aceitação.** Reset funcional ponta-a-ponta; tokens expirados rejeitados; sessões antigas invalidadas.

---

## Persona 2 — Cliente

**Objetivo principal:** receber um plano alimentar semanal adequado ao seu objetivo, condição de saúde, gostos e orçamento — com receitas e lista de compras — gastando pouco dado móvel; e, a partir da Fase 3, encomendar o rancho a uma loja parceira.

Funcionalidades: `F1-CLI-01` Perfil de saúde · `F1-CLI-02` Geração do plano por IA · `F1-CLI-03` Consulta do plano · `F1-CLI-04` Receita da refeição · `F1-CLI-05` Feedback e troca de refeição · `F1-CLI-06` Lista de compras · `F3-CLI-07` Encomendar rancho a uma loja.

---

### F1-CLI-01 — Perfil de saúde e preferências (onboarding)

| | |
|---|---|
| **Prioridade** | **MVP** — "Conta e perfil do cliente (objectivo, condição de saúde)" na cotação |
| **Telas** | T-03 Onboarding (wizard), T-08 Perfil |

**Descrição funcional.** Após o registo, o cliente responde a um questionário curto (no espírito do quiz de 2 perguntas da landing) que alimenta a geração de planos: objetivo, condição de saúde, alergias/exclusões, orçamento e nº de refeições por dia. Editável a qualquer momento em "Perfil".

**Fluxo do utilizador.**
1. Wizard passo-a-passo (1 pergunta por ecrã, mobile-first):
   - **Objetivo** (obrigatório, 1 de 4): `Perder peso` · `Comer melhor no dia a dia` · `Ganhar massa` · `Gerir uma condição de saúde` (labels da landing).
   - **Condição de saúde** (obrigatório, 1 de 4): `Nenhuma` · `Diabetes tipo 2` · `Hipertensão` · `Doença celíaca` (labels da landing).
   - **Alergias / não como** (opcional, multi-seleção + texto livre): ex. amendoim, marisco, lactose.
   - **Orçamento semanal aproximado** (opcional): faixa em MT (`baixo / médio / confortável`) — usado na otimização do rancho.
   - **Refeições por dia** (default 3): pequeno-almoço, almoço, jantar (+ lanches **[Sugestão]**).
2. Resumo → confirmar → perfil gravado → CTA "Gerar o meu primeiro plano" (F1-CLI-02).

**Regras de negócio.**
- Sem perfil completo (objetivo + condição) não é possível gerar plano.
- Alterar objetivo, condição ou alergias **não** altera planos já gerados; passa a valer na próxima geração (aviso na UI).
- Condição de saúde e alergias são dados sensíveis: nunca partilhados com terceiros (compromisso da FAQ da landing), acesso registado em auditoria, e enviados ao fornecedor de IA apenas como parâmetros da geração.

**Tarefas — Frontend.**
- Wizard `/onboarding` (5 passos + resumo) com progresso; página `/perfil` de edição.
- Persistir rascunho do wizard localmente (voltar atrás sem perder respostas).

**Tarefas — Backend.**
- `GET/PUT /api/v1/me/profile` — cria/atualiza `client_profiles` (upsert 1:1 com `users`).
- Enum de objetivos e condições no domínio (`Goal`, `HealthCondition`) alinhado com os valores da landing.

**Tarefas — Base de dados.**
- Tabela `client_profiles` (V2): `goal`, `health_condition`, `allergies` (jsonb), `budget_band`, `meals_per_day`.

**Endpoints.** `GET /api/v1/me/profile` · `PUT /api/v1/me/profile`.

**Validações.** `goal` e `health_condition` dentro dos enums; `meals_per_day` 2–5; alergias ≤ 20 itens, cada ≤ 60 chars; `budget_band` no enum.

**Estados possíveis.** Wizard: `passo 1..5 → resumo → guardado`. Perfil: `incompleto | completo`. Página: `loading | edição | saving | saved | erro`.

**Critérios de aceitação.**
- [ ] Perfil completo é pré-condição verificada (403/409 no backend) para gerar plano.
- [ ] Os 4 objetivos e as 4 condições da landing existem exatamente com esses labels pt-PT.
- [ ] Editar perfil não muda planos existentes e a UI comunica isso.
- [ ] Todas as leituras/escritas de perfil ficam em `audit_log`.

---

### F1-CLI-02 — Geração do plano alimentar semanal por IA

| | |
|---|---|
| **Prioridade** | **MVP** — coração da cotação ("planos alimentares semanais gerados por IA, com pratos moçambicanos reais") |
| **Telas** | T-04 Dashboard do plano (estado "a gerar"), T-03 fim do onboarding |

**Descrição funcional.** O cliente pede um plano para a semana; o backend monta um prompt com o perfil + histórico de feedback + catálogo de receitas elegíveis e chama a OpenAI (structured outputs) para compor 7 dias × N refeições, **escolhendo apenas receitas do catálogo**. O resultado é persistido e apresentado com macros por refeição (anel de macros, como na landing).

**Fluxo do utilizador.**
1. No dashboard sem plano ativo (ou via "Gerar novo plano"), clica **"Gerar o meu plano da semana"**.
2. Ecrã de progresso (mensagens rotativas, ex. "A escolher pratos moçambicanos para ti…"); geração típica 10–30 s.
3. Plano aparece no dashboard (F1-CLI-03). Em caso de falha, mensagem clara + botão "Tentar novamente".

**Regras de negócio.**
- **Grounding obrigatório:** a IA recebe a lista de receitas elegíveis (id, nome, tags, macros, custo estimado) já **pré-filtrada pelo backend** por condição de saúde e alergias; a resposta só pode referenciar `recipe_id` dessa lista. Resposta com id fora da lista → rejeitada e repetida (máx. 2 retries) → erro controlado.
- Filtros de segurança por condição (aplicados no backend, não confiados à LLM): `diabetes_tipo_2` → excluir receitas com tag `alto_acucar`, priorizar `acucar_controlado`; `hipertensao` → excluir `alto_sodio`, priorizar `baixo_sodio`; `doenca_celiaca` → **excluir** tudo o que não tenha tag `sem_gluten` (filtro duro); alergias → excluir receitas cujo ingrediente conste das exclusões.
- 1 plano ativo por cliente. Gerar novo plano arquiva o anterior (`status = ARCHIVED`), que deixa de ser editável.
- Limite de gerações: 3/dia por cliente (controlo de custo OpenAI; configurável).
- Aprendizagem contínua (entrada): receitas com feedback negativo do cliente (F1-CLI-05) são despriorizadas/excluídas do prompt; as com feedback positivo são sinalizadas como preferidas.
- Cada geração regista em `ai_generation_log`: modelo, tokens, duração, sucesso/erro (rastreabilidade e custo).
- O plano guarda um snapshot dos dados nutricionais no momento da geração (edições posteriores do admin às receitas não alteram planos já entregues).

**Tarefas — Frontend.**
- CTA de geração + ecrã de progresso: chamada **síncrona** ao endpoint (`await`, sem polling), mensagens rotativas por temporizador local enquanto aguarda a resposta (10–30 s).
- Tratamento de erro com retry manual e mensagem quando o limite diário é atingido.

**Tarefas — Backend.**
- `POST /api/v1/me/meal-plans` — **síncrono**: o Route Handler chama a IA, valida e persiste tudo antes de responder (`maxDuration` alargado — Vercel Pro; mudança de plano face ao padrão assíncrono original). Devolve o plano pronto.
- `mealPlanService.generate()`: pré-filtro de receitas → prompt → chamada OpenAI (JSON Schema estrito) → validação de ids/estrutura → persistência do plano + entradas + snapshot (numa transação Prisma).
- `AiMealPlanService` (interface) + `openAiMealPlanService` (impl) — fornecedor trocável.
- Registo em `ai_generation_log`; limite diário; timeouts + retries com backoff.

**Tarefas — Base de dados.**
- Tabelas `meal_plans`, `meal_plan_entries` (V3), `ai_generation_log` (V3).
- Catálogo mínimo: seed de ≥ 40 receitas moçambicanas com tags e macros (V5 — pré-condição funcional do MVP; conteúdo fornecido/validado pelo cliente do projeto).

**Endpoints.** `POST /api/v1/me/meal-plans` (síncrono — devolve o plano pronto) · `GET /api/v1/me/meal-plans/{id}` (consulta pontual de um plano específico, ex. deep-link).

**Validações.** Perfil completo; sem geração já em curso; limite diário não excedido; resposta da IA validada contra JSON Schema + ids do catálogo + cobertura completa (7 dias × N refeições).

**Estados possíveis.** Plano: `READY | FAILED`; e `ACTIVE → ARCHIVED`. UI: `idle → requesting(a aguardar resposta) → ready | failed(retry) | limit_reached`.

**Critérios de aceitação.**
- [ ] Plano gerado tem 7 dias × N refeições, todas com receita existente no catálogo.
- [ ] Cliente celíaco nunca recebe receita sem tag `sem_gluten`; alergias nunca aparecem nos ingredientes do plano (testado com fixtures).
- [ ] Falha da OpenAI produz erro controlado e o cliente consegue repetir; nada fica meio-gravado (transação).
- [ ] Cada geração fica registada com tokens/duração/custo estimado.
- [ ] Feedback negativo anterior a uma receita impede-a de voltar no plano seguinte (salvo catálogo insuficiente — nesse caso é despriorizada).

---

### F1-CLI-03 — Consulta do plano semanal

| | |
|---|---|
| **Prioridade** | **MVP** |
| **Telas** | T-04 Dashboard do plano |

**Descrição funcional.** Vista principal do portal do cliente: a semana em curso, navegável por dia, com as refeições (nome do prato, kcal, mini-anel de macros) e acesso à receita e à lista de compras. Deve funcionar offline depois de carregada (promessa da FAQ da landing).

**Fluxo do utilizador.**
1. Cliente autenticado abre `/plano` → plano ativo carregado.
2. Navega entre dias (tabs/scroll horizontal seg–dom, dia atual pré-selecionado).
3. Toca numa refeição → detalhe/receita (F1-CLI-04). Acesso permanente a "Lista de compras" e "Gerar novo plano".
4. Sem plano ativo → empty state com CTA de geração.

**Regras de negócio.**
- Mostra sempre o plano `ACTIVE`; planos `ARCHIVED` ficam acessíveis em "histórico" simples (lista, leitura) **[Sugestão]**.
- O plano completo (com receitas) é cacheado no dispositivo via service worker após o primeiro load — consulta posterior não gasta dados.
- Totais diários (kcal, macros) calculados a partir do snapshot do plano.

**Tarefas — Frontend.**
- Página `/plano`: cabeçalho da semana, navegação por dia, cartões de refeição com mini anel de macros (SVG, mesma técnica `stroke-dasharray` da landing).
- Estratégia PWA: precache do shell + runtime cache do plano ativo (stale-while-revalidate); indicador "offline — a mostrar plano guardado".
- Empty state (sem plano) e estado FAILED com retry.

**Tarefas — Backend.**
- `GET /api/v1/me/meal-plans/active` — devolve plano completo (dias → entradas → resumo da receita + macros) num único payload compacto (uma chamada, poupança de dados).

**Tarefas — Base de dados.**
- Índices para leitura rápida: `meal_plans(user_id, status)`, `meal_plan_entries(meal_plan_id)` (V3).

**Endpoints.** `GET /api/v1/me/meal-plans/active`.

**Validações.** Apenas o dono do plano lhe acede (ownership check em todas as rotas `me/`).

**Estados possíveis.** `loading | ready | empty(sem plano) | generating | offline(cache) | error`.

**Critérios de aceitação.**
- [ ] Plano completo carrega numa única chamada e pesa < 200 KB (sem imagens).
- [ ] Com o dispositivo offline, o plano já visitado continua consultável (incl. receitas).
- [ ] Dia atual pré-selecionado; totais do dia corretos face ao snapshot.
- [ ] Um cliente nunca consegue ler o plano de outro (teste de autorização).

---

### F1-CLI-04 — Detalhe da refeição com receita

| | |
|---|---|
| **Prioridade** | **MVP** — "Receita para cada prato sugerido" na cotação |
| **Telas** | T-05 Detalhe de refeição/receita |

**Descrição funcional.** Cada refeição do plano abre a receita completa: ingredientes com quantidades por porção, passos numerados simples ("pensadas para o dia a dia, não para uma cozinha profissional" — FAQ da landing), tempo de preparação, custo estimado, kcal e anel de macros (proteína/carboidratos/gordura/fibra — cores e ordem da landing), e notas de saúde quando aplicável (ex. "baixo em sódio — sempre com o teu médico a acompanhar").

**Fluxo do utilizador.**
1. Toca numa refeição no dashboard → `/plano/refeicao/{entryId}`.
2. Lê receita; pode marcar feedback (F1-CLI-05) ou voltar.

**Regras de negócio.**
- A receita mostrada é o **snapshot** guardado no plano (consistência com o que foi gerado).
- Nota de condição de saúde aparece quando a receita tem tags relevantes para a condição do cliente.
- Disclaimer médico visível no rodapé da tela.

**Tarefas — Frontend.**
- Página de detalhe: hero com nome + chips (kcal, tempo, custo — formato dos chips da landing), anel de macros grande com legenda, lista de ingredientes, passos numerados.
- Conteúdo servido do cache do plano quando offline.

**Tarefas — Backend.**
- `GET /api/v1/me/meal-plans/entries/{entryId}` (ou embebido no payload do plano ativo — decisão: **embebido**, este endpoint é fallback para deep-link).

**Tarefas — Base de dados.**
- Snapshot em `meal_plan_entries.recipe_snapshot` (jsonb) definido na V3.

**Endpoints.** `GET /api/v1/me/meal-plans/entries/{entryId}`.

**Validações.** Ownership; entrada pertence a plano do próprio.

**Estados possíveis.** `loading | ready | offline(cache) | not_found | error`.

**Critérios de aceitação.**
- [ ] Toda a refeição do plano tem receita com ≥ 1 ingrediente e ≥ 2 passos.
- [ ] Macros do anel somam 100% (±1 por arredondamento) e batem com o snapshot.
- [ ] Notas de saúde aparecem para as condições certas; disclaimer sempre presente.

---

### F1-CLI-05 — Feedback e troca de refeição (aprendizagem contínua)

| | |
|---|---|
| **Prioridade** | **MVP** — "Integração de IA com fluxo de aprendizagem contínua — tanto do catálogo de receitas como das preferências do utilizador" na cotação |
| **Telas** | T-05 Detalhe de refeição, T-04 Dashboard |

**Descrição funcional.** O cliente reage a qualquer refeição ("👍 gosto" / "👎 não gosto") e pode **trocar** uma refeição por uma alternativa compatível. O feedback alimenta as gerações seguintes — é o mecanismo de "aprendizagem contínua das preferências do utilizador"; do lado do catálogo, o agregado de feedback por receita é visível ao admin (F2-ADM-05) para curar o conteúdo.

**Fluxo do utilizador.**
1. No detalhe da refeição toca 👍/👎 (toggle imediato, otimista).
2. Com 👎, a app oferece **"Trocar este prato"** → backend devolve alternativa compatível do catálogo → cliente aceita ou mantém.
3. Aceitando, a entrada do plano é substituída (novo snapshot) e a lista de compras é recalculada.

**Regras de negócio.**
- Feedback é por (cliente, receita) — o último valor prevalece; histórico guardado com timestamp.
- A alternativa de troca respeita os mesmos filtros duros da geração (condição, alergias) e aproxima-se do slot (tipo de refeição) e das kcal (±20%) da original; **sem chamada à IA** — seleção determinística no catálogo (rápida, custo zero).
- Máx. de trocas por plano: sem limite funcional; cada troca fica em `audit_log`.
- Na geração seguinte (F1-CLI-02): receitas 👎 são excluídas do prompt (ou despriorizadas se o catálogo filtrado ficar < mínimo viável); receitas 👍 são marcadas como preferidas.

**Tarefas — Frontend.**
- Botões 👍/👎 com update otimista + rollback em erro.
- Fluxo de troca: bottom-sheet com a alternativa proposta (nome, kcal, macros) → confirmar/cancelar → refrescar plano e lista.

**Tarefas — Backend.**
- `PUT /api/v1/me/recipes/{recipeId}/feedback` (body: `LIKE|DISLIKE|NONE`).
- `POST /api/v1/me/meal-plans/entries/{entryId}/swap` — propõe e (com `confirm=true`) aplica alternativa; recalcula lista de compras na mesma transação.
- Incorporar feedback no pré-filtro/prompt da geração.

**Tarefas — Base de dados.**
- Tabela `meal_feedback` (V3): unique (user_id, recipe_id), valor, timestamps.

**Endpoints.** `PUT /api/v1/me/recipes/{recipeId}/feedback` · `POST /api/v1/me/meal-plans/entries/{entryId}/swap`.

**Validações.** Valor de feedback no enum; entry do próprio e plano `ACTIVE`; existe alternativa compatível (senão 409 com mensagem "sem alternativa disponível").

**Estados possíveis.** Feedback: `none | like | dislike` (+ `saving`). Troca: `proposing → proposed → confirming → applied | cancelled | no_alternative`.

**Critérios de aceitação.**
- [ ] Feedback persiste e sobrevive a refresh/novo login.
- [ ] Troca substitui a refeição, atualiza snapshot e lista de compras de forma atómica.
- [ ] Receita 👎 não reaparece na geração seguinte (fixture com catálogo suficiente).
- [ ] Sem alternativa compatível, o cliente recebe mensagem clara e o plano fica intacto.

---

### F1-CLI-06 — Lista de compras / rancho optimizado

| | |
|---|---|
| **Prioridade** | **MVP** — "Lista de compras / rancho optimizado" na cotação |
| **Telas** | T-06 Lista de compras |

**Descrição funcional.** A partir do plano ativo, a app agrega os ingredientes de todas as receitas da semana numa lista única de rancho: quantidades somadas e normalizadas por unidade, agrupadas por categoria (cereais, proteína, vegetais, temperos…), com checkbox por item para marcar durante a compra. "Optimizado" no MVP = agregação sem desperdício + ordenação por categoria + estimativa de custo por faixa quando existir preço de referência do ingrediente.

**Fluxo do utilizador.**
1. Do dashboard, abre "Lista de compras" (`/compras`).
2. Vê itens agrupados por categoria com quantidade total da semana.
3. Marca itens à medida que compra (persistido; funciona offline com sync ao voltar a rede **[Sugestão]** — no MVP, persistência local + sync best-effort).

**Regras de negócio.**
- A lista é derivada do plano ativo e regenerada quando o plano muda (geração nova ou troca de refeição); itens já marcados mantêm o estado se o ingrediente se mantiver.
- Agregação: soma por `ingredient_id` convertendo unidades compatíveis (g↔kg, ml↔l); unidades incompatíveis geram linhas separadas.
- Estimativa de custo total usa `ingredients.reference_price` quando preenchido; sem preço, o item não contribui e a UI indica "estimativa parcial". (Preços reais por loja chegam na Fase 2 via catálogo — cruzá-los com a lista é `FUT-03` **[Sugestão]**.)
- Lista pertence ao plano (1:1 com `meal_plans`).

**Tarefas — Frontend.**
- Página `/compras`: grupos por categoria, checkboxes, contador "X de Y", custo estimado (com nota de parcialidade), botão "Partilhar/copiar lista" (texto simples) **[Sugestão]**.
- Cache offline da lista; fila local de toggles com sync.

**Tarefas — Backend.**
- Serviço de agregação (`ShoppingListService.rebuildForPlan(planId)`) chamado na conclusão da geração e nas trocas.
- `GET /api/v1/me/shopping-list` (do plano ativo) · `PATCH /api/v1/me/shopping-list/items/{itemId}` (checked).

**Tarefas — Base de dados.**
- Tabelas `shopping_lists`, `shopping_list_items` (V3); categorias como enum/atributo do ingrediente (V2).

**Endpoints.** `GET /api/v1/me/shopping-list` · `PATCH /api/v1/me/shopping-list/items/{itemId}`.

**Validações.** Ownership; item pertence à lista do plano ativo; `checked` booleano.

**Estados possíveis.** `loading | ready | empty(sem plano) | offline(cache) | syncing | error`. Item: `unchecked | checked`.

**Critérios de aceitação.**
- [ ] Todos os ingredientes de todas as refeições da semana aparecem, agregados e sem duplicados por unidade compatível.
- [ ] Trocar uma refeição atualiza a lista mantendo o estado dos itens não afetados.
- [ ] Estados marcados persistem entre sessões e dispositivos.
- [ ] Custo estimado aparece quando há preços de referência e declara-se parcial quando não há.

---

### F3-CLI-07 — Encomendar rancho/compras a uma loja parceira

| | |
|---|---|
| **Prioridade** | **Fase 3** — mudança de plano: o cliente passa a poder encomendar os itens da lista de compras a uma loja parceira |
| **Telas** | T-06 Lista de compras (CTA "Encomendar"), T-20 Escolher loja, T-21 Rever e confirmar encomenda, T-22 Minhas encomendas |

**Descrição funcional.** A partir da lista de compras (F1-CLI-06), o cliente escolhe uma loja parceira ativa e envia os itens (todos ou uma seleção) como um pedido de encomenda. A loja recebe o pedido no seu portal (F3-LOJ-03) e atualiza o estado à medida que o prepara. **O sistema não gere entrega nem pagamento** — esses combinam-se diretamente entre cliente e loja (o contacto da loja fica visível no pedido); a plataforma só regista o pedido e o seu estado.

**Fluxo do utilizador.**
1. Em `/compras`, o cliente toca **"Encomendar rancho"**.
2. Escolhe uma loja parceira ativa de uma lista simples (nome, cidade, contacto).
3. Revê a lista de itens pré-selecionada (todos marcados por omissão); pode desmarcar itens ou ajustar quantidade; opcionalmente escreve uma nota (ex. "posso levantar depois das 18h").
4. Confirma → encomenda criada com estado `PENDENTE` → ecrã de confirmação com o contacto da loja.
5. Em `/encomendas` ("Minhas encomendas"), acompanha o estado (`PENDENTE → ACEITE → EM_PREPARACAO → PRONTA → CONCLUIDA`, ou `RECUSADA`/`CANCELADA`).

**Regras de negócio.**
- Uma encomenda pertence a **uma única loja** (sem split entre lojas na v1 — o cliente repete o fluxo se quiser encomendar a mais do que uma loja).
- Itens da encomenda são um snapshot (nome, quantidade, unidade) no momento do pedido; alterações posteriores à lista de compras não afetam encomendas já enviadas.
- Preço não é obrigatório: se a loja tiver o produto no seu catálogo (F3-LOJ-01) com preço, o item mostra preço unitário e total estimado; senão, mostra apenas quantidade (sem custo).
- Cliente pode **cancelar** enquanto a encomenda estiver `PENDENTE` ou `ACEITE`; depois de `EM_PREPARACAO` já não.
- Loja suspensa não aparece na lista de escolha.
- Contacto da loja (`stores.contact`) é sempre visível ao cliente após confirmar; é assim que entrega e pagamento se combinam, fora do sistema.
- Todas as mudanças de estado ficam em `audit_log`.

**Tarefas — Frontend.**
- CTA "Encomendar rancho" em T-06; T-20 lista de lojas ativas; T-21 revisão de itens (checkbox + quantidade editável + nota) com confirmação; T-22 "Minhas encomendas" (lista com estado-badge + detalhe simples).
- Atualização de estado por refresh/polling manual (sem push no MVP da Fase 3).

**Tarefas — Backend.**
- `POST /api/v1/me/orders` — cria encomenda a partir de itens selecionados da lista de compras ativa.
- `GET /api/v1/me/orders` (lista, paginada) · `GET /api/v1/me/orders/{id}` (detalhe) · `PATCH /api/v1/me/orders/{id}/cancel`.
- Resolver preço unitário por correspondência (por nome, best-effort) no catálogo da loja escolhida, sem obrigar ligação forte produto↔ingrediente.

**Tarefas — Base de dados.**
- Tabelas `orders`, `order_items` (V6 — Fase 3). Ver `04-database-plan.md`.

**Endpoints.** `POST /api/v1/me/orders` · `GET /api/v1/me/orders` · `GET /api/v1/me/orders/{id}` · `PATCH /api/v1/me/orders/{id}/cancel`.

**Validações.** Loja existente e `ACTIVE`; ≥ 1 item selecionado; quantidade > 0; ownership (cliente só vê as suas encomendas); cancelamento só em `PENDENTE`/`ACEITE`.

**Estados possíveis.** Encomenda: `PENDENTE | ACEITE | EM_PREPARACAO | PRONTA | CONCLUIDA | RECUSADA | CANCELADA`. UI: `loading | ready | empty (sem encomendas) | confirming | error`.

**Critérios de aceitação.**
- [ ] Cliente consegue enviar uma encomenda com um subconjunto da lista de compras a uma loja ativa.
- [ ] Encomenda mostra sempre o contacto da loja; não existe nenhum ecrã de pagamento ou de escolha de entrega.
- [ ] Estado da encomenda atualizado pela loja aparece em "Minhas encomendas" do cliente.
- [ ] Cancelamento só é possível antes de `EM_PREPARACAO`.

---

## Persona 3 — Administrador

**Objetivo principal:** manter os dados que alimentam a IA (receitas, ingredientes, nutrição), gerir clientes e o registo de lojas parceiras, e acompanhar a utilização da plataforma. **Mudança de plano:** a gestão do catálogo de produtos/preços deixou de ser responsabilidade do admin — passa a ser feita por cada loja no seu próprio portal (Fase 3, ver Persona 4 — Lojista).

Funcionalidades: `F2-ADM-01` Gestão de utilizadores · `F2-ADM-02` CRUD de lojas · `F2-ADM-05` Dados da IA (receitas/ingredientes/nutrição) · `F2-ADM-06` Métricas.

> Acesso: todas as rotas `/admin/**` (FE) e `/api/v1/admin/**` (BE) exigem role `ADMIN`. O primeiro admin é criado por seed de migration; admins adicionais via F2-ADM-01.

---

### F2-ADM-01 — Gestão de utilizadores/clientes

| | |
|---|---|
| **Prioridade** | **Fase 2** — "Gestão de utilizadores/clientes" na cotação |
| **Telas** | T-10 Lista de utilizadores, T-11 Detalhe de utilizador |

**Descrição funcional.** O admin lista, pesquisa e consulta contas; ativa/suspende clientes; cria outros admins. A consulta mostra dados de conta e resumo de atividade (nº de planos, último acesso) — **sem** expor o conteúdo de saúde do perfil por defeito (dado sensível; ver regras).

**Fluxo do utilizador.**
1. `/admin/utilizadores`: tabela paginada com pesquisa (nome/email) e filtros (role, estado).
2. Abre um utilizador → detalhe (dados de conta, estado, atividade) → ações: suspender/reativar, promover a admin **[Sugestão]**.
3. Confirmação explícita para ações de estado.

**Regras de negócio.**
- Suspender impede login imediato e revoga refresh tokens ativos; não apaga dados.
- Admin não pode suspender-se a si próprio; tem de existir sempre ≥ 1 admin ativo.
- Perfil de saúde do cliente só é visível mediante ação explícita "ver perfil de saúde", registada em `audit_log` (minimização de acesso a dado sensível).
- Remoção definitiva de conta não faz parte da Fase 2 (**[Sugestão]** Futuro, com anonimização).

**Tarefas — Frontend.**
- Tabela paginada server-side (pesquisa, filtros, ordenação), página de detalhe, diálogos de confirmação.

**Tarefas — Backend.**
- `GET /api/v1/admin/users` (paginado, filtros) · `GET /api/v1/admin/users/{id}` · `PATCH /api/v1/admin/users/{id}/status` · `POST /api/v1/admin/users` (criar admin ou lojista — lojista exige `storeId` válido) **[Sugestão para admin; obrigatório para lojista — ver F2-ADM-02]**.
- Revogação de refresh tokens na suspensão; guarda de "último admin".

**Tarefas — Base de dados.**
- Reutiliza `users`/`client_profiles`; índice de pesquisa (`lower(name)`, `lower(email)`); vista de contagens por utilizador (ou query agregada).

**Endpoints.** `GET /api/v1/admin/users` · `GET /api/v1/admin/users/{id}` · `PATCH /api/v1/admin/users/{id}/status`.

**Validações.** Estado no enum (`ACTIVE|SUSPENDED`); não suspender o próprio; paginação `page≥0`, `size≤100`.

**Estados possíveis.** Conta: `ACTIVE | SUSPENDED`. UI: `loading | ready | empty(pesquisa sem resultados) | acting | error`.

**Critérios de aceitação.**
- [ ] Pesquisa e filtros funcionam server-side com paginação.
- [ ] Suspensão corta o acesso do cliente em ≤ 15 min (expiração do access token) e imediatamente no refresh.
- [ ] Acesso ao perfil de saúde exige clique explícito e fica auditado.
- [ ] Impossível ficar sem admins ativos.

---

### F2-ADM-02 — CRUD de lojas parceiras

| | |
|---|---|
| **Prioridade** | **Fase 2** — "CRUD completo de lojas parceiras (criar, editar, suspender, remover)" na cotação |
| **Telas** | T-12 Lista de lojas, T-13 Formulário de loja |

**Descrição funcional.** Gestão do catálogo de lojas onde os ingredientes/produtos podem ser comprados: nome, localização (cidade/bairro), contacto, estado. As lojas suportam o catálogo de produtos e preços (F2-ADM-03).

**Fluxo do utilizador.**
1. `/admin/lojas`: tabela com pesquisa e filtro por estado.
2. "Nova loja" → formulário → guardar. Editar idem.
3. Suspender (reversível) ou remover (definitivo, só sem dependências — ver regras).

**Regras de negócio.**
- Nome + cidade únicos (evitar duplicados).
- **Suspender**: a loja deixa de ser selecionável no fluxo de encomenda do cliente (F3-CLI-07) e o seu catálogo deixa de ser editável pelo lojista, mas os dados mantêm-se.
- **Remover**: hard delete apenas se a loja não tiver conta de lojista, produtos ou encomendas associadas (Fase 3); caso tenha, a UI só permite suspender.
- Ao criar uma loja, o admin pode (opcional) criar de imediato a conta de acesso do lojista (`role=LOJISTA`, ligada via `users.store_id`) — ou fazê-lo depois em F2-ADM-01.
- Operações ficam em `audit_log` (quem, quando, o quê).

**Tarefas — Frontend.**
- Tabela + formulário (criar/editar) + ações com confirmação; badges de estado.

**Tarefas — Backend.**
- `GET/POST /api/v1/admin/stores` · `GET/PUT/DELETE /api/v1/admin/stores/{id}` · `PATCH /api/v1/admin/stores/{id}/status`.

**Tarefas — Base de dados.**
- Tabela `stores` (V4): nome, cidade, bairro, contacto, `status`; unique (lower(name), lower(city)).

**Endpoints.** Ver acima.

**Validações.** Nome 2–120; cidade obrigatória; contacto formato livre ≤ 60; estado no enum; unicidade nome+cidade (409).

**Estados possíveis.** Loja: `ACTIVE | SUSPENDED`. UI: `loading | ready | empty | saving | deleting | error | conflict(duplicado)`.

**Critérios de aceitação.**
- [ ] CRUD completo funcional com paginação e pesquisa.
- [ ] Remover loja com produtos exige confirmação dupla e remove os preços associados em transação única.
- [ ] Loja suspensa desaparece de qualquer seleção voltada ao cliente.

---

> **F2-ADM-03 e F2-ADM-04 (CRUD de produtos/preços e import/export Excel) saíram do âmbito do Portal Admin.** Mudança de plano: cada loja passa a manter o seu próprio catálogo, no novo Portal da Loja — ver `F3-LOJ-01` e `F3-LOJ-02` na Persona 4 — Lojista, mais abaixo.

---

### F2-ADM-05 — Gestão dos dados da IA: receitas, ingredientes e nutrição

| | |
|---|---|
| **Prioridade** | **Fase 2** — "Carregamento e manutenção dos dados que alimentam a LLM (receitas, ingredientes, nutrição)" na cotação. **Nota de dependência:** o MVP precisa de um catálogo mínimo (seed V5, ver F1-CLI-02); esta funcionalidade é a UI de manutenção contínua. |
| **Telas** | T-17 Lista de receitas, T-18 Formulário de receita, T-19 Ingredientes |

**Descrição funcional.** O coração anti-alucinação: CRUD de **ingredientes** (nome, categoria, unidade base, nutrição por 100 g/ml, preço de referência opcional) e de **receitas** (nome, descrição, passos, tempo, porções, tags de saúde, ingredientes com quantidades). Os macros da receita são calculados a partir dos ingredientes, com possibilidade de override manual. Inclui visão do feedback agregado dos clientes por receita (lado "catálogo" da aprendizagem contínua).

**Fluxo do utilizador.**
1. `/admin/receitas`: tabela (pesquisa, filtro por tag/estado) com coluna de feedback (👍/👎 agregado).
2. "Nova receita" → formulário: dados gerais, tags de saúde (`sem_gluten`, `baixo_sodio`, `acucar_controlado`, `alto_sodio`, `alto_acucar`, `vegetariana`, …), ingredientes (autocomplete + quantidade + unidade), passos ordenados.
3. Guardar como `DRAFT` ou **Publicar** (`PUBLISHED` = elegível para a IA). Despublicar volta a `DRAFT`.
4. `/admin/ingredientes`: CRUD tabular equivalente.

**Regras de negócio.**
- Só receitas `PUBLISHED` entram no pré-filtro da geração (F1-CLI-02).
- Publicar exige: ≥ 1 ingrediente, ≥ 2 passos, kcal e 4 macros definidos (calculados ou override), ≥ 1 tag de saúde avaliada (nem que seja "nenhuma restrição").
- Editar receita publicada **não** altera planos existentes (snapshots); vale para gerações futuras.
- Ingrediente não pode ser removido se usado em receitas (bloqueio com lista de onde é usado); pode ser desativado.
- Coerência de tags é responsabilidade editorial do admin, mas o sistema avisa (warning, não bloqueio) sobre contradições óbvias (ex. `sem_gluten` com ingrediente `trigo`) **[Sugestão]**.
- Alterações ficam em `audit_log`.

**Tarefas — Frontend.**
- Tabela de receitas com feedback agregado; formulário rico (lista dinâmica de ingredientes, ordenação de passos, multi-select de tags); CRUD de ingredientes com edição inline da nutrição.

**Tarefas — Backend.**
- `GET/POST /api/v1/admin/recipes` · `GET/PUT/DELETE /api/v1/admin/recipes/{id}` · `PATCH /api/v1/admin/recipes/{id}/status` (publish/unpublish).
- `GET/POST /api/v1/admin/ingredients` · `GET/PUT/DELETE /api/v1/admin/ingredients/{id}`.
- Cálculo de macros a partir de `recipe_ingredients` × nutrição do ingrediente; agregação de `meal_feedback` por receita.

**Tarefas — Base de dados.**
- Tabelas `ingredients`, `recipes`, `recipe_ingredients`, `recipe_steps` (ou passos jsonb — decisão em `04-database-plan.md`: **jsonb**), tags (array text + índice GIN) — V2.

**Endpoints.** Ver acima.

**Validações.** Nome de receita único (lower); quantidades > 0; unidades compatíveis com a unidade base do ingrediente; regras de publicação verificadas server-side; nutrição por 100 g com valores ≥ 0 e plausíveis (kcal ≤ 900/100 g).

**Estados possíveis.** Receita: `DRAFT | PUBLISHED`. Ingrediente: `ACTIVE | INACTIVE`. UI: `loading | ready | empty | saving | publish_blocked(motivos) | error`.

**Critérios de aceitação.**
- [ ] Receita só fica elegível para a IA quando `PUBLISHED` e completa (regras verificadas no backend).
- [ ] Macros calculados batem com a soma dos ingredientes (tolerância de arredondamento) e o override manual é assinalado.
- [ ] Ingrediente em uso não é removível; o bloqueio lista as receitas afetadas.
- [ ] O admin vê o feedback agregado dos clientes por receita.

---

### F2-ADM-06 — Métricas básicas de utilização

| | |
|---|---|
| **Prioridade** | **Fase 2** — "Métricas básicas de utilização da plataforma" na cotação |
| **Telas** | T-09 Dashboard admin |

**Descrição funcional.** Dashboard de entrada do portal admin com indicadores básicos: utilizadores registados (total e novos por período), planos gerados, taxa de sucesso das gerações, receitas mais/menos gostadas, custo estimado de IA no período. Sem ferramentas externas de analytics (privacidade + simplicidade).

**Fluxo do utilizador.**
1. `/admin` mostra cartões de KPI + 1–2 gráficos simples (série temporal de planos gerados; top receitas por feedback), com filtro de período (7/30/90 dias).

**Regras de negócio.**
- Métricas derivadas de dados operacionais (`users`, `meal_plans`, `ai_generation_log`, `meal_feedback`) — sem tracking de comportamento no dispositivo do cliente.
- Agregações calculadas on-read no MVP da Fase 2 (volumes baixos); materialização é **[Sugestão]** Futuro.
- Custo de IA = soma de tokens × preço configurado por 1K tokens (env var).

**Tarefas — Frontend.**
- Cartões de KPI, gráfico de linhas (planos/dia) e tabela top/bottom receitas; seletor de período.

**Tarefas — Backend.**
- `GET /api/v1/admin/metrics/summary?period=30d` — payload único com todos os KPIs e séries.

**Tarefas — Base de dados.**
- Índices por data (`meal_plans.created_at`, `users.created_at`, `ai_generation_log.created_at`) — já previstos nas migrations.

**Endpoints.** `GET /api/v1/admin/metrics/summary`.

**Validações.** `period` ∈ {7d, 30d, 90d}.

**Estados possíveis.** `loading | ready | empty(sem dados no período) | error`.

**Critérios de aceitação.**
- [ ] KPIs corretos face a fixtures conhecidas.
- [ ] Dashboard carrega numa única chamada em < 2 s com 10k planos.
- [ ] Filtro de período altera todos os números coerentemente.

---

## Persona 4 — Lojista

**Objetivo principal:** manter o catálogo de produtos e preços da sua própria loja (manual ou Excel) e gerir o estado das encomendas recebidas dos clientes — sem se preocupar com entrega nem pagamento, tratados fora do sistema.

Funcionalidades: `F3-LOJ-01` Catálogo de produtos da loja · `F3-LOJ-02` Import/export Excel do catálogo · `F3-LOJ-03` Gestão de encomendas.

> Acesso: todas as rotas `/loja/**` (FE) e `/api/v1/loja/**` (BE) exigem role `LOJISTA`; o lojista só vê e edita dados da **sua própria loja** (`store_id` do token) — nunca escolhe nem vê outras lojas. Conta criada pelo admin (F2-ADM-01/02); sem self-registo público na Fase 3.

---

### F3-LOJ-01 — Catálogo de produtos e preços da loja

| | |
|---|---|
| **Prioridade** | **Fase 3** — substitui o antigo F2-ADM-03, agora escopado à própria loja |
| **Telas** | T-23 Lista de produtos da loja, T-24 Formulário de produto |

**Descrição funcional.** O lojista mantém a lista de produtos que vende (ex. "Arroz agulha 1 kg", "Amendoim torrado 500 g") com o respetivo preço, através de um CRUD simples — sem necessidade de escolher a loja (é sempre a sua).

**Fluxo do utilizador.**
1. `/loja/produtos`: tabela (pesquisa por nome, filtro por categoria/estado).
2. "Novo produto" → nome, categoria, unidade/tamanho, preço (MT) → guardar.
3. Editar/desativar/remover a qualquer momento.

**Regras de negócio.**
- Produto pertence a uma loja (`store_id` obrigatório, resolvido do token — nunca vindo do cliente).
- Nome único **dentro da loja** (duas lojas podem ter produtos com o mesmo nome).
- Preço em MT, > 0, 2 casas decimais.
- Remover produto é permitido salvo se referenciado por uma encomenda em curso (`PENDENTE`/`ACEITE`/`EM_PREPARACAO`) — nesse caso só desativar.
- Produto de loja suspensa (pelo admin) mantém-se mas não é visível ao cliente.

**Tarefas — Frontend.**
- Tabela + formulário simples (sem seletor de loja); badges de estado.

**Tarefas — Backend.**
- `GET/POST /api/v1/loja/products` · `GET/PUT/DELETE /api/v1/loja/products/{id}` · `PATCH /api/v1/loja/products/{id}/status` — todos escopados ao `store_id` do lojista autenticado.

**Tarefas — Base de dados.**
- Tabela `products` redesenhada (V6 — Fase 3): agora com `store_id` obrigatório e `price_mt` na própria linha (sem tabela `store_products` separada — cada produto já pertence a uma única loja). Ver `04-database-plan.md`.

**Endpoints.** Ver acima.

**Validações.** Nome 2–160 único (lower) dentro da loja; categoria no enum; preço decimal(10,2) > 0.

**Estados possíveis.** Produto: `ACTIVE | INACTIVE`. UI: `loading | ready | empty | saving | deleting | error | conflict`.

**Critérios de aceitação.**
- [ ] CRUD completo funcional, sempre restrito à loja do lojista autenticado.
- [ ] Lojista nunca consegue ler/editar produtos de outra loja (teste de autorização).
- [ ] Produto em encomenda ativa não é removível, só desativável.

---

### F3-LOJ-02 — Import/exportação Excel do catálogo da loja

| | |
|---|---|
| **Prioridade** | **Fase 3** — substitui o antigo F2-ADM-04, agora escopado à própria loja |
| **Telas** | T-25 Import Excel (upload → pré-visualização → resultado) |

**Descrição funcional.** Alternativa em massa ao CRUD: o lojista descarrega um template `.xlsx`, preenche produtos e preços, e importa. Igual em espírito ao antigo fluxo admin, mas sem coluna de loja (é sempre a própria).

**Fluxo do utilizador.**
1. `/loja/produtos/importar`: descarrega template ou exportação atual.
2. Upload do `.xlsx` → pré-visualização com erros por linha.
3. Confirma → import aplicado transacionalmente → relatório final.

**Regras de negócio.**
- Colunas do template: `produto`, `categoria`, `unidade`, `preco_mt`.
- Upsert por nome (lower) **dentro da loja do lojista autenticado**.
- Tudo-ou-nada por defeito; opção "importar apenas linhas válidas".
- Limites: ≤ 2 000 linhas (catálogo de uma loja é bem menor que o catálogo global do antigo F2-ADM-04), ficheiro ≤ 5 MB, apenas `.xlsx`.
- Cada import gera registo em `import_jobs` (loja, quem, quando, ficheiro, contagens, estado).

**Tarefas — Frontend.**
- Reaproveita o padrão do antigo T-16 (admin): drag-&-drop, pré-visualização, confirmação, resultado.

**Tarefas — Backend.**
- `POST /api/v1/loja/products/import` (multipart; modo `validate`) → pré-visualização; `POST .../import/{jobId}/confirm` → aplica.
- `GET /api/v1/loja/products/export` e `GET /api/v1/loja/products/import-template` (`exceljs`, streaming).

**Tarefas — Base de dados.**
- Tabela `import_jobs` (V6 — Fase 3): agora com `store_id`.

**Endpoints.** Ver acima.

**Validações.** Extensão/MIME/tamanho; cabeçalhos do template; por linha: nome obrigatório, categoria no enum, preço > 0.

**Estados possíveis.** Job: `VALIDATED → APPLIED | DISCARDED | FAILED`. UI: `idle → uploading → validating → preview(ok/erros) → confirming → done | failed`.

**Critérios de aceitação.**
- [ ] Round-trip: exportar → reimportar sem alterações produz 0 criados / 0 erros.
- [ ] Import nunca cria/edita produtos de outra loja.
- [ ] Ficheiro com erros mostra linha e motivo em português; nada aplicado sem confirmação.

---

### F3-LOJ-03 — Gestão de encomendas

| | |
|---|---|
| **Prioridade** | **Fase 3** — núcleo da mudança de plano: a loja gere o estado dos pedidos dos clientes; **entrega e pagamento ficam fora do sistema** |
| **Telas** | T-26 Lista de encomendas, T-27 Detalhe de encomenda |

**Descrição funcional.** O lojista vê os pedidos (`orders`) feitos por clientes à sua loja (F3-CLI-07): itens pedidos, contacto do cliente, e um estado que atualiza à medida que prepara o pedido. O sistema **não** processa pagamento nem organiza entrega/levantamento — apenas comunica o estado; os detalhes combinam-se diretamente com o cliente pelo contacto apresentado.

**Fluxo do utilizador.**
1. `/loja/encomendas`: tabela (filtro por estado, mais recentes primeiro).
2. Abre uma encomenda → vê itens (nome, quantidade, unidade, preço se aplicável), nome e contacto do cliente, nota do cliente (se houver).
3. Avança o estado com um botão/dropdown de transição válida (`PENDENTE → ACEITE → EM_PREPARACAO → PRONTA → CONCLUIDA`) ou marca `RECUSADA` (com motivo opcional).

**Regras de negócio.**
- Transições de estado válidas apenas nesta ordem; `RECUSADA` só a partir de `PENDENTE`/`ACEITE`; `CANCELADA` é ação do cliente (F3-CLI-07), não do lojista.
- Lojista só vê/edita encomendas da sua própria loja (ownership por `store_id`).
- Nenhum campo de pagamento, valor cobrado, morada de entrega ou transportadora existe no sistema — **decisão de âmbito explícita**, não uma omissão.
- Toda a mudança de estado fica em `audit_log` e é visível ao cliente (F3-CLI-07) na próxima consulta.

**Tarefas — Frontend.**
- Tabela (DataTable) com estado-badge e filtro; página de detalhe com botões de transição válidos para o estado atual (os inválidos nem aparecem).

**Tarefas — Backend.**
- `GET /api/v1/loja/orders` (paginado, filtro estado) · `GET /api/v1/loja/orders/{id}` · `PATCH /api/v1/loja/orders/{id}/status` (valida transição server-side, com código de erro próprio para transição inválida).

**Tarefas — Base de dados.**
- Tabelas `orders`, `order_items` (V6 — Fase 3). Ver `04-database-plan.md`.

**Endpoints.** Ver acima.

**Validações.** Ownership (loja do token); transição pertence ao conjunto de transições válidas a partir do estado atual; motivo de recusa ≤ 200 chars (opcional).

**Estados possíveis.** Encomenda: `PENDENTE | ACEITE | EM_PREPARACAO | PRONTA | CONCLUIDA | RECUSADA | CANCELADA`. UI: `loading | ready | empty (sem encomendas) | acting | error`.

**Critérios de aceitação.**
- [ ] Lojista só vê encomendas da sua loja (teste de autorização).
- [ ] Transição de estado inválida é rejeitada pelo backend (não só escondida na UI).
- [ ] Cliente vê o novo estado assim que consulta "Minhas encomendas".
- [ ] Nenhuma tela ou endpoint do sistema processa pagamento ou define entrega/logística.

---

## Futuro — fora da cotação (todas **[Sugestão]**)

| ID | Funcionalidade | Origem / racional | Dependências |
|---|---|---|---|
| **FUT-01** | **Entrega/levantamento e pagamento geridos pela plataforma** — hoje o cliente já encomenda (F3-CLI-07), mas entrega e pagamento são combinados diretamente com a loja, fora do sistema; automatizar isso (entrega ao domicílio, pagamento in-app) fica para depois | Passo "05" no "Como funciona" da landing; decisão explícita de âmbito na Fase 3 (mudança de plano) | F3-CLI-07 + F3-LOJ-03 em produção; operador logístico; gateway de pagamento |
| **FUT-02** | Notificações (email/WhatsApp): plano novo pronto, lembrete semanal | FAQ/footer da landing mencionam WhatsApp como canal | Fornecedor de mensagens; consentimento |
| **FUT-03** | Custeio comparativo da lista de compras entre lojas ("onde comprar mais barato") | Ponte natural entre a lista (Fase 1) e o catálogo de preços por loja (Fase 3) | F3-LOJ-01 povoado; ligação produto↔ingrediente |
| **FUT-04** | Landing page pública + lista de espera (implementação do design `project/Leve Sabor AI.dc.html` como página pública do Next.js) | O design existe no repo; a cotação cobre os dois portais, não a landing | Nenhuma técnica; decidir se a waitlist persiste na BD |
| **FUT-05** | Recuperação de password (F1-VIS-03) | Higiene de conta | Serviço de email |
| **FUT-06** | Histórico de preços por loja e histórico de planos navegável | Extensões diretas dos modelos da Fase 2 | — |
