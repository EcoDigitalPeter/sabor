# 02 — Plano de UI/UX

> Mapa de telas dos dois portais, componentes por tela, estados de UI, navegação e prompts para geração de imagens. A identidade visual é herdada da landing page (`project/Leve Sabor AI.dc.html`) — fonte única de verdade para tokens.

---

## 1. Design tokens (extraídos da landing)

### Cores

| Token | Hex | Uso |
|---|---|---|
| `cream` | `#F6ECDC` | Fundo base da app (light) e texto sobre escuro |
| `cream-card` | `#FFFFFF` | Cartões sobre cream |
| `cream-card-alt` | `#FBF5EA` | Cartões alternativos, inputs |
| `ink` | `#241A14` | Texto principal; fundos de secções escuras (hero, nav admin) |
| `ink-soft` | `#2F231B` | Cartões sobre ink |
| `terracotta` | `#C43E1C` | Cor primária de ação (CTA principal, marca), proteína no anel |
| `terracotta-dark` | `#A63417` | Hover do CTA |
| `amber` | `#E3A72E` | Destaques, eyebrows, carboidratos no anel |
| `amber-soft` | `#F0BC55` | Hover amber |
| `forest` | `#45614A` | Positivo/sucesso, fibra no anel |
| `clay` | `#5B4A3A` | Texto secundário sobre claro |
| `clay-soft` | `#8A7A65` | Texto terciário/labels |
| `tan` | `#E7C9A0` | Chips, cartão CTA da waitlist, gordura no anel |
| `muted-on-dark` | `#B8A88F` / `#C9BBA4` | Texto secundário sobre escuro |
| erro | `#C43E1C` | Mensagens de erro (mesmo terracotta) |

### Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Display | **Bricolage Grotesque** (400–800) | Títulos, nomes de pratos, KPIs |
| Corpo | **Work Sans** (400–700) | Texto, formulários, botões |
| Mono | **IBM Plex Mono** (500–600) | Números: kcal, macros, preços, códigos |

### Forma e movimento

- Botões/CTAs: pílulas `border-radius: 100px`; cartões `12–24px`; inputs `10px`.
- Foco visível sempre: `outline: 3px solid` (amber sobre escuro, terracotta sobre claro) — padrão de acessibilidade da landing.
- Animações discretas: `ls-rise` (fade+translateY 14px, 0.4–0.6s) para entrada de blocos; `ls-ring-in` (scale+rotate) para o anel de macros. Nada mais.
- Mobile-first: tudo desenhado a 360 px primeiro; breakpoints fluidos com `clamp()`.

### Componente-assinatura: Anel de Macros

SVG com `stroke-dasharray`/`stroke-dashoffset` (técnica exata da landing), 4 segmentos **nesta ordem e cores**:
`Proteína #C43E1C` → `Carboidratos #E3A72E` → `Gordura #E7C9A0` → `Fibra #45614A`, kcal ao centro em IBM Plex Mono. Variantes: `sm` 44 px (cartão de refeição), `md` 112 px (resultado/resumo), `lg` 220 px (detalhe de receita, com legenda).

---

## 2. Mapa de telas e navegação

```
PÚBLICO                    PORTAL CLIENTE (role CLIENTE)          PORTAL ADMIN (role ADMIN)
───────                    ─────────────────────────────          ─────────────────────────
T-01 Login ──────────────▶ T-04 Dashboard do plano ◀──────┐       T-09 Dashboard métricas
  │  ▲                       │        │        │          │         │
  ▼  │ (logout)              ▼        ▼        ▼          │         ├─▶ T-10 Utilizadores ─▶ T-11 Detalhe
T-02 Registo               T-05     T-06     T-08         │         ├─▶ T-12 Lojas ────────▶ T-13 Form loja
  │                        Receita  Compras  Perfil       │         ├─▶ T-17 Receitas ─────▶ T-18 Form receita
  ▼ (1ª vez)                 │        │                   │         └─▶ T-19 Ingredientes
T-03 Onboarding ─────────▶ T-07 A gerar plano ────────────┘
                                      ▼ ("Encomendar")
                             T-20 Escolher loja ─▶ T-21 Rever encomenda ─▶ T-22 Minhas encomendas

PORTAL DA LOJA (role LOJISTA) — Fase 3
──────────────────────────────────────
T-01 Login (mesmo ecrã, redireciona por role)
  ├─▶ T-23 Produtos da loja ──▶ T-24 Form produto
  ├─▶ T-25 Import Excel (loja)
  └─▶ T-26 Encomendas ─────────▶ T-27 Detalhe de encomenda
```

- **Navegação do cliente (mobile):** bottom-nav fixa com 3 itens — `Plano` (T-04) · `Compras` (T-06) · `Perfil` (T-08). T-05, T-07 e T-20/T-21/T-22 são telas empilhadas (voltar).
- **Navegação do admin (desktop-first, funciona em tablet):** sidebar esquerda — `Dashboard` · `Utilizadores` · `Lojas` · `Receitas` · `Ingredientes`; topbar com nome do admin + logout.
- **Navegação da loja (Fase 3, desktop-first):** sidebar esquerda — `Produtos` · `Encomendas`; topbar com nome da loja + logout.
- Rotas protegidas por role (`CLIENTE` | `ADMIN` | `LOJISTA`); utilizador autenticado que abre `/login` é redirecionado para o seu portal.

### Estados de UI — padrão transversal

Toda a tela com dados remotos implementa os 4 estados:

| Estado | Padrão visual |
|---|---|
| **Loading** | Skeletons (blocos cream-card-alt pulsantes) com a mesma geometria do conteúdo; nunca spinner de página inteira, exceto T-07 |
| **Empty** | Ilustração pequena + título Bricolage + frase de ação + CTA primário (prompts de imagem em §4) |
| **Erro** | Cartão com ícone, mensagem em português claro (sem stack traces), botão "Tentar novamente"; erros de formulário inline por campo |
| **Sucesso** | Toast discreto (2,5 s) para ações rápidas; ecrã de confirmação para ações longas (registo, import) |

---

## 3. Especificação por tela

### T-01 — Login `(/login)` — Fase 1

- **Objetivo:** autenticar cliente ou admin.
- **Componentes:** logotipo (anel SVG da marca), formulário em cartão, CTA primário, link "Criar conta", link "Esqueci-me da password" **[Sugestão — Futuro]**.
- **Campos/ações:** email (text), password (password, toggle mostrar), botão `Entrar` (pílula terracotta), link para T-02.
- **Estados:** `idle · submitting (botão com spinner interno) · invalid_credentials (banner) · suspended (banner próprio) · erro de rede`.

### T-02 — Registo `(/registo)` — Fase 1

- **Objetivo:** criar conta de cliente.
- **Componentes:** formulário em cartão, checkbox de disclaimer, CTA.
- **Campos/ações:** nome, email, password, confirmar password, checkbox "Compreendo que a Ottimizo não substitui o meu médico ou nutricionista", botão `Criar conta`.
- **Estados:** `idle · submitting · erro por campo · email duplicado (409, inline no campo) · sucesso → redireciona T-03`.

### T-03 — Onboarding do perfil `(/onboarding)` — Fase 1

- **Objetivo:** recolher objetivo, condição de saúde, alergias, orçamento e refeições/dia (F1-CLI-01).
- **Componentes:** wizard 1-pergunta-por-ecrã (padrão do quiz da landing), barra de progresso, grelha de botões-opção (cartões 12px, hover amber — estilo dos botões do quiz), passo de resumo.
- **Campos/ações:** passo 1 objetivo (4 opções), passo 2 condição (4 opções), passo 3 alergias (chips multi-select + campo livre), passo 4 orçamento (3 faixas), passo 5 refeições/dia (stepper 2–5); `Continuar`/`Voltar`; resumo com `Confirmar` → CTA "Gerar o meu plano".
- **Estados:** `passo N · saving · erro · concluído`. Rascunho local preservado ao voltar atrás.

### T-04 — Dashboard do plano semanal `(/plano)` — Fase 1

- **Objetivo:** consultar a semana e navegar para receitas/compras (F1-CLI-03).
- **Componentes:** cabeçalho ("O teu plano · 12–18 Jul"), tabs de dias (seg–dom, scroll horizontal, dia atual ativo), lista de cartões de refeição (nome do prato em Bricolage, chips mono `620 kcal · 35 min`, anel `sm`), resumo do dia (kcal totais + macros), banner offline quando aplicável, FAB/botão `Gerar novo plano`.
- **Ações:** tocar refeição → T-05; `Compras` (bottom-nav) → T-06; gerar novo plano (confirmação: "o plano atual será arquivado") → T-07.
- **Estados:** `loading (skeleton de 3 cartões) · ready · empty (sem plano → ilustração + CTA "Gerar o meu primeiro plano") · generating (redireciona T-07) · offline (banner "a mostrar plano guardado") · erro`.

### T-05 — Detalhe da refeição / receita `(/plano/refeicao/{id})` — Fase 1

- **Objetivo:** apresentar a receita completa (F1-CLI-04) e recolher feedback (F1-CLI-05).
- **Componentes:** header com nome do prato + chips (kcal, tempo, custo estimado — estilo chips tan da landing), anel `lg` com legenda de 4 macros (linha: quadrado de cor 12px + label + valor mono, exatamente como a secção Macros da landing), botões 👍/👎, botão `Trocar este prato` (aparece com 👎), lista de ingredientes (quantidade mono + nome), passos numerados (número em IBM Plex Mono terracotta, como os passos "01–05" da landing), nota de saúde (quando aplicável, ex. "Baixo em sódio — sempre com o teu médico a acompanhar"), rodapé com disclaimer.
- **Ações:** feedback (toggle otimista), troca → bottom-sheet com alternativa (nome, kcal, anel `sm`) → `Confirmar troca`/`Manter`.
- **Estados:** `loading · ready · offline(cache) · troca: proposing/proposed/applied/no_alternative (mensagem "Sem alternativa disponível para as tuas restrições") · erro`.

### T-06 — Lista de compras `(/compras)` — Fase 1

- **Objetivo:** lista de rancho da semana com marcação durante a compra (F1-CLI-06).
- **Componentes:** cabeçalho com progresso ("12 de 28 comprados") e custo estimado (mono, com nota "estimativa parcial" quando aplicável), grupos colapsáveis por categoria (Cereais e farinhas, Proteína, Vegetais e folhas, Leguminosas, Temperos e óleos, Outros), linhas com checkbox + nome + quantidade mono, botão `Copiar lista` **[Sugestão]**.
- **Ações:** marcar/desmarcar item (persistência otimista), colapsar grupos.
- **Estados:** `loading · ready · empty (sem plano ativo → CTA para T-04) · offline (funciona; badge "por sincronizar") · syncing · erro`.

### T-07 — A gerar plano `(/plano/gerar)` — Fase 1

- **Objetivo:** ocupar a espera da geração por IA (10–30 s) com confiança (F1-CLI-02).
- **Componentes:** anel de marca animado (rotação), mensagens rotativas ("A escolher pratos moçambicanos para ti…", "A equilibrar as tuas macros…", "A montar a lista de compras…"), nota de rodapé com disclaimer.
- **Ações:** nenhuma (sem cancelar no MVP).
- **Estados:** `generating (polling) · ready → redireciona T-04 · failed (mensagem + `Tentar novamente`) · limit_reached ("Atingiste o limite de hoje — tenta amanhã")`.

### T-08 — Perfil `(/perfil)` — Fase 1

- **Objetivo:** ver/editar o perfil de saúde e sair da conta (F1-CLI-01).
- **Componentes:** cartões editáveis por secção (objetivo, condição, alergias, orçamento, refeições/dia — mesmo vocabulário do onboarding), aviso "as alterações valem a partir do próximo plano", botão `Terminar sessão`.
- **Estados:** `loading · edição · saving · saved (toast) · erro`.

### T-09 — Dashboard admin `(/admin)` — Fase 2

- **Objetivo:** visão de métricas básicas (F2-ADM-06).
- **Componentes:** 4 cartões KPI (Utilizadores, Novos no período, Planos gerados, Taxa de sucesso da IA), gráfico de linhas "planos gerados/dia", tabela "Receitas com melhor/pior feedback", cartão "Custo estimado de IA", seletor de período (7/30/90 dias).
- **Estados:** `loading (skeleton dos cartões) · ready · empty (sem dados no período) · erro`.

### T-10 — Utilizadores `(/admin/utilizadores)` — Fase 2

- **Objetivo:** listar e encontrar contas (F2-ADM-01).
- **Componentes:** barra de pesquisa (nome/email), filtros (role, estado), tabela paginada (nome, email, role, estado-badge, registado em, último acesso), paginação server-side.
- **Ações:** abrir detalhe (T-11).
- **Estados:** `loading · ready · empty (pesquisa sem resultados: "Nenhum utilizador encontrado para '<termo>'") · erro`.

### T-11 — Detalhe de utilizador `(/admin/utilizadores/{id})` — Fase 2

- **Objetivo:** consultar conta e agir sobre o estado (F2-ADM-01).
- **Componentes:** cartão de identidade (nome, email, role, estado, datas), cartão de atividade (nº planos, última geração), botão `Ver perfil de saúde` (ação explícita e auditada, revela objetivo/condição/alergias), botões `Suspender`/`Reativar` com diálogo de confirmação.
- **Estados:** `loading · ready · acting · confirmação · sucesso (toast) · erro (ex.: "não podes suspender a tua própria conta")`.

### T-12 — Lojas `(/admin/lojas)` — Fase 2

- **Objetivo:** catálogo de lojas parceiras (F2-ADM-02).
- **Componentes:** pesquisa, filtro de estado, tabela (nome, cidade, contacto, estado-badge, nº produtos), botão `Nova loja`.
- **Ações:** criar/editar (T-13), suspender/reativar, remover (com confirmação; dupla se houver produtos).
- **Estados:** `loading · ready · empty ("Ainda sem lojas — cria a primeira") · deleting · erro · conflict (duplicado)`.

### T-13 — Formulário de loja `(/admin/lojas/nova|{id})` — Fase 2

- **Objetivo:** registar/editar loja; opcionalmente criar a conta de acesso do lojista.
- **Componentes:** campos nome, cidade, bairro, contacto; secção opcional "Criar acesso do lojista" (email + password inicial).
- **Estados:** `edição · saving · saved · erro por campo · conflict`.

> T-14/T-15/T-16 (Produtos, Form. de produto, Import Excel no admin) foram **removidas** — mudança de plano: o catálogo passa a ser gerido por cada loja (ver T-23/T-24/T-25, Portal da Loja, mais abaixo).

### T-17 — Receitas `(/admin/receitas)` — Fase 2

- **Objetivo:** curar o catálogo que alimenta a IA (F2-ADM-05).
- **Componentes:** pesquisa, filtros (estado DRAFT/PUBLISHED, tags de saúde), tabela (nome, tags-chips, kcal, estado-badge, feedback agregado 👍/👎), botão `Nova receita`.
- **Estados:** `loading · ready · empty · erro`.

### T-18 — Formulário de receita `(/admin/receitas/nova|{id})` — Fase 2

- **Objetivo:** criar/editar receita completa e publicá-la.
- **Componentes:** secção geral (nome, descrição, tempo, porções, custo estimado), multi-select de tags de saúde, lista dinâmica de ingredientes (autocomplete + quantidade + unidade), lista ordenável de passos, painel de macros calculados (anel `md` de pré-visualização + toggle de override manual), botões `Guardar rascunho` / `Publicar`.
- **Estados:** `edição · saving · publish_blocked (checklist dos requisitos em falta) · published (badge) · erro`.

### T-19 — Ingredientes `(/admin/ingredientes)` — Fase 2

- **Objetivo:** manter a base nutricional (F2-ADM-05).
- **Componentes:** pesquisa, tabela editável (nome, categoria, unidade base, kcal/100g, proteína, carbs, gordura, fibra, preço de referência MT opcional, estado), botão `Novo ingrediente`.
- **Ações:** edição inline ou drawer; desativar; remover (bloqueado se em uso — modal lista as receitas afetadas).
- **Estados:** `loading · ready · empty · saving · blocked_delete · erro`.

### T-20 — Escolher loja `(/compras/encomendar)` — Fase 3

- **Objetivo:** escolher a loja parceira para onde enviar a encomenda (F3-CLI-07).
- **Componentes:** lista de lojas ativas (cartão: nome, cidade, contacto), pesquisa simples.
- **Ações:** selecionar loja → T-21.
- **Estados:** `loading · ready · empty (sem lojas ativas) · erro`.

### T-21 — Rever e confirmar encomenda `(/compras/encomendar/{storeId})` — Fase 3

- **Objetivo:** rever/ajustar os itens antes de enviar a encomenda (F3-CLI-07).
- **Componentes:** lista de itens da lista de compras (checkbox pré-marcado, quantidade editável), campo de nota opcional, resumo (nº itens, custo estimado se houver preços), contacto da loja visível, botão `Confirmar encomenda`.
- **Estados:** `ready · confirming · success (→ T-22) · erro`.

### T-22 — Minhas encomendas `(/encomendas)` — Fase 3

- **Objetivo:** acompanhar o estado das encomendas do cliente (F3-CLI-07).
- **Componentes:** lista (loja, data, estado-badge, nº itens), detalhe simples (itens, nota, contacto da loja), botão `Cancelar` quando aplicável.
- **Estados:** `loading · ready · empty (ainda sem encomendas) · acting (cancelar) · erro`.

### T-23 — Produtos da loja `(/loja/produtos)` — Fase 3

- **Objetivo:** catálogo de produtos da própria loja (F3-LOJ-01).
- **Componentes:** pesquisa, filtro por categoria/estado, tabela (nome, categoria, unidade, preço MT, estado-badge), botões `Novo produto`, `Importar Excel`, `Exportar Excel`.
- **Estados:** `loading · ready · empty ("Ainda sem produtos — cria o primeiro ou importa um Excel") · erro`.

### T-24 — Formulário de produto da loja `(/loja/produtos/novo|{id})` — Fase 3

- **Objetivo:** criar/editar produto e preço (F3-LOJ-01).
- **Componentes:** campos nome, categoria (select), unidade/tamanho, preço (MT).
- **Estados:** `edição · saving · saved · erro por campo · conflict (nome duplicado nesta loja)`.

### T-25 — Import Excel da loja `(/loja/produtos/importar)` — Fase 3

- **Objetivo:** import em massa do catálogo da loja (F3-LOJ-02).
- **Componentes:** zona drag-&-drop (.xlsx, máx 5 MB), links `Descarregar template` / `Exportar catálogo atual`, tabela de pré-visualização (erros destacados a terracotta), resumo, toggle "importar apenas linhas válidas", botão `Confirmar importação`, ecrã de resultado.
- **Estados:** `idle · uploading · validating · preview · confirming · done · failed`.

### T-26 — Encomendas `(/loja/encomendas)` — Fase 3

- **Objetivo:** listar os pedidos recebidos (F3-LOJ-03).
- **Componentes:** filtro por estado, tabela (cliente, data, nº itens, estado-badge).
- **Ações:** abrir detalhe (T-27).
- **Estados:** `loading · ready · empty ("Ainda sem encomendas") · erro`.

### T-27 — Detalhe de encomenda `(/loja/encomendas/{id})` — Fase 3

- **Objetivo:** ver itens/contacto do cliente e avançar o estado (F3-LOJ-03).
- **Componentes:** cartão do cliente (nome, contacto, nota), lista de itens (nome, quantidade, unidade, preço se aplicável), botões de transição de estado válidos para o estado atual (ex.: só mostra `Aceitar`/`Recusar` quando `PENDENTE`).
- **Estados:** `loading · ready · acting · sucesso (toast) · erro`.

---

## 4. Prompts para geração de imagens (ChatGPT)

> A app usa ilustração leve e pontual — o peso visual vem da tipografia e das cores. Regra transversal: **nada de fotografia realista de pessoas, nada de texto embutido na imagem, fundos transparentes ou cream `#F6ECDC`**, ficheiros otimizados (SVG quando possível; senão PNG < 60 KB) por causa do orçamento de dados móveis.

### P-01 — Ilustração do onboarding (T-03, primeiro passo)

- **Contexto de uso:** topo do primeiro ecrã do wizard, acima de "Qual é o teu objetivo?"; ~240 px de largura em mobile.
- **Estilo visual:** ilustração flat minimalista com traço orgânico, sem contornos pretos, formas geométricas suaves; estética editorial calorosa (não corporate, não cartoon infantil).
- **Formato/tamanho:** quadrado 1:1, 800×800 px, fundo transparente (PNG) ou cream `#F6ECDC`.
- **Elementos que devem aparecer:** um prato moçambicano estilizado visto de cima (tigela com xima e vegetais), rodeado por pequenos símbolos abstratos de objetivo — uma seta suave, uma folha, um coração — dispostos em círculo, ecoando um anel.
- **Elementos que NÃO devem aparecer:** pessoas, texto/letras/números, logótipos, fotografia realista, balanças de casa de banho, fitas métricas, imagens de "antes/depois" (sensibilidade em torno de peso).
- **Cores sugeridas:** paleta restrita — terracotta `#C43E1C`, amber `#E3A72E`, forest `#45614A`, tan `#E7C9A0` sobre cream `#F6ECDC`; ink `#241A14` apenas em detalhes.

### P-02 — Empty state "ainda sem plano" (T-04)

- **Contexto de uso:** centro do dashboard quando o cliente ainda não gerou nenhum plano; acima do CTA "Gerar o meu primeiro plano"; ~200 px.
- **Estilo visual:** mesma linguagem flat/orgânica de P-01; tom otimista e leve.
- **Formato/tamanho:** 1:1, 600×600 px, fundo transparente.
- **Elementos que devem aparecer:** um prato vazio estilizado com talheres aos lados e, a pairar sobre ele, três pequenas formas tracejadas (silhuetas de comida "por chegar") sugerindo antecipação; um brilho/faísca discreto.
- **Elementos que NÃO devem aparecer:** texto, pessoas, rostos tristes, caixotes de lixo, insetos, qualquer conotação negativa de prato vazio (fome).
- **Cores sugeridas:** contornos clay `#5B4A3A`, acentos amber `#E3A72E` e terracotta `#C43E1C`, sobre transparente/cream.

### P-03 — Ecrã de geração por IA (T-07)

- **Contexto de uso:** animação/ilustração central enquanto a IA gera o plano (10–30 s); pode ser um SVG estático que a app roda/anima por CSS; ~220 px.
- **Estilo visual:** abstrato-geométrico, alinhado com o anel de macros da marca; sensação de "algo a compor-se".
- **Formato/tamanho:** 1:1, 800×800 px, SVG de preferência (para animar segmentos), senão PNG transparente.
- **Elementos que devem aparecer:** anel segmentado incompleto (4 segmentos em arco, espessura generosa) com pequenos ícones de ingredientes minimalistas (folha, peixe, grão de milho, amendoim) a orbitar; centro vazio (a app sobrepõe texto).
- **Elementos que NÃO devem aparecer:** texto/números, robôs, cérebros, circuitos, "chips" de IA, chatbots — a IA deve ser invisível, a comida é a protagonista.
- **Cores sugeridas:** os 4 segmentos exatamente nas cores dos macros — `#C43E1C`, `#E3A72E`, `#E7C9A0`, `#45614A` — sobre fundo transparente (será usado sobre cream e sobre ink).

### P-04 — Empty state da lista de compras (T-06)

- **Contexto de uso:** quando não há plano ativo e a lista está vazia; ~180 px.
- **Estilo visual:** flat/orgânico consistente com P-01/P-02.
- **Formato/tamanho:** 1:1, 600×600 px, fundo transparente.
- **Elementos que devem aparecer:** um cesto de compras de mercado (palha trançada, estética moçambicana) vazio mas convidativo, com uma etiqueta/talão em branco ao lado.
- **Elementos que NÃO devem aparecer:** texto, carrinhos de supermercado metálicos (contexto é mercado local), dinheiro/notas, marcas.
- **Cores sugeridas:** tan `#E7C9A0` e clay `#5B4A3A` dominantes, acento terracotta.

### P-05 — Ilustração de sucesso do registo/onboarding (T-03, resumo)

- **Contexto de uso:** passo final do onboarding, junto de "Tudo pronto!" e do CTA de gerar plano; ~180 px.
- **Estilo visual:** flat/orgânico, celebratório mas contido.
- **Formato/tamanho:** 1:1, 600×600 px, fundo transparente.
- **Elementos que devem aparecer:** o anel da marca completo (4 segmentos fechados) com um visto (checkmark) orgânico ao centro e 2–3 pequenas folhas/faíscas à volta.
- **Elementos que NÃO devem aparecer:** texto, troféus, medalhas, confetti excessivo, polegares para cima.
- **Cores sugeridas:** segmentos nas 4 cores dos macros; visto em forest `#45614A`.

### P-06 — Ícones das categorias da lista de compras (T-06, T-19)

- **Contexto de uso:** ícone 24×24 px à esquerda do título de cada grupo da lista de compras e nas categorias de ingredientes do admin — 6 categorias: cereais e farinhas, proteína, vegetais e folhas, leguminosas, temperos e óleos, outros.
- **Estilo visual:** conjunto coerente de ícones de linha (stroke 2 px, cantos arredondados), um único peso, estilo "hand-drawn discreto"; pedir **os 6 no mesmo pedido** para garantir consistência.
- **Formato/tamanho:** SVG (ou PNG 96×96), grelha 24×24, área de desenho 20×20.
- **Elementos que devem aparecer:** cereais = espiga de milho; proteína = peixe; vegetais = folha de couve; leguminosas = vagem com 3 grãos (feijão nhemba); temperos = pilão ou malagueta; outros = cesto pequeno.
- **Elementos que NÃO devem aparecer:** preenchimentos sólidos, sombras, gradientes, texto, itens fora do contexto alimentar moçambicano (ex.: bretzel, sushi).
- **Cores sugeridas:** stroke único ink `#241A14` (a app recolore por CSS para clay/terracotta conforme o contexto).

### P-07 — Banner do portal admin (T-09) **[Sugestão]**

- **Contexto de uso:** faixa decorativa no topo do dashboard admin (desktop), atrás dos KPIs; largura total, ~160 px de altura visível.
- **Estilo visual:** padrão abstrato e calmo, quase textura — não ilustrativo.
- **Formato/tamanho:** 1920×320 px, PNG/SVG, pode ter fundo ink `#241A14`.
- **Elementos que devem aparecer:** padrão geométrico esparso de arcos/segmentos de anel e pontos, assimétrico, com bastante espaço vazio.
- **Elementos que NÃO devem aparecer:** comida literal, pessoas, texto, gráficos/charts falsos.
- **Cores sugeridas:** sobre ink `#241A14`, traços em terracotta `#C43E1C`, amber `#E3A72E` e cream `#F6ECDC` com opacidades baixas (10–30%).

> **Nota:** o logótipo (anel de 2 arcos) já existe como SVG inline na landing — reutilizar esse markup; não gerar por IA. Ícones utilitários (setas, lixo, editar…) devem vir de uma biblioteca open-source (ex. Lucide) e não de geração de imagem.

---

## 5. Estrutura recomendada do projeto (Next.js fullstack)

> **Mudança de plano:** deploy no Vercel — um único projeto Next.js (App Router) serve os **três** portais (Cliente, Admin, Loja) **e** o backend (Route Handlers em `app/api/v1/**`, ver `03-backend-plan.md`). PWA apenas na área do cliente.

```
levesabor-web/
├── next.config.mjs                  # + @ducanh2912/next-pwa (service worker só em produção)
├── prisma/
│   ├── schema.prisma                 # modelo de dados (ver 04-database-plan.md)
│   └── migrations/                   # histórico versionado (prisma migrate)
├── public/
│   ├── manifest.webmanifest         # nome, ícones, theme_color #C43E1C, background #F6ECDC
│   └── icons/                       # PWA icons + ilustrações P-01..P-07 otimizadas
├── src/
│   ├── app/
│   │   ├── (auth)/login/  (auth)/registo/            # T-01, T-02 (layout público)
│   │   ├── (cliente)/                                # layout com bottom-nav; guarda role CLIENTE
│   │   │   ├── onboarding/                           # T-03
│   │   │   ├── plano/            page.tsx            # T-04
│   │   │   ├── plano/gerar/      page.tsx            # T-07 (maxDuration alargado — chamada síncrona à IA)
│   │   │   ├── plano/refeicao/[entryId]/page.tsx     # T-05
│   │   │   ├── compras/          page.tsx            # T-06
│   │   │   ├── compras/encomendar/[storeId]/page.tsx # T-20, T-21 (Fase 3)
│   │   │   ├── encomendas/       page.tsx            # T-22 (Fase 3)
│   │   │   └── perfil/           page.tsx            # T-08
│   │   ├── admin/                                    # layout com sidebar; guarda role ADMIN
│   │   │   ├── page.tsx                              # T-09
│   │   │   ├── utilizadores/ [id]/                   # T-10, T-11
│   │   │   ├── lojas/ nova|[id]/                     # T-12, T-13
│   │   │   ├── receitas/ nova|[id]/                  # T-17, T-18
│   │   │   └── ingredientes/                         # T-19
│   │   ├── loja/                                     # layout com sidebar; guarda role LOJISTA — Fase 3
│   │   │   ├── produtos/ novo|[id]|importar/          # T-23, T-24, T-25
│   │   │   └── encomendas/ [id]/                      # T-26, T-27
│   │   └── api/v1/**/route.ts                        # Backend — Route Handlers (ver 03-backend-plan.md)
│   ├── server/                        # camada de backend (dentro do mesmo projeto)
│   │   ├── services/ · repositories/ · dto/ · errors/ · security/   # ver 03-backend-plan.md §2
│   │   └── prisma.ts                  # cliente Prisma singleton
│   ├── components/
│   │   ├── ui/                    # Button, Input, Card, Toast, Skeleton, EmptyState, Modal (tokens §1)
│   │   ├── macro-ring/            # MacroRing sm|md|lg (SVG, técnica da landing)
│   │   ├── plan/                  # MealCard, DayTabs, DaySummary
│   │   └── admin/                 # DataTable paginada server-side, StatusBadge, ConfirmDialog, KpiCard (reutilizado por Admin e Loja)
│   ├── lib/
│   │   ├── api.ts                 # cliente HTTP do frontend: injeta Bearer, refresh automático em 401, desembrulha ApiResponse (mesma origem — sem CORS)
│   │   ├── auth.ts                # sessão, roles, guards
│   │   └── offline.ts             # cache do plano/lista, fila de toggles da lista
│   ├── hooks/                     # useActivePlan, useShoppingList, useOrders, …
│   ├── types/                     # tipos gerados do OpenAPI (openapi-typescript) — contrato partilhado FE/BE
│   └── styles/tokens.css          # variáveis CSS = tabela §1 (fonte única no código)
└── e2e/                           # Playwright: fluxos da checklist de entrega
```

Diretrizes:
- **Dados:** TanStack Query sobre `lib/api.ts`; sem estado global além de sessão + queries. Tipos do contrato gerados a partir do OpenAPI (nunca escritos à mão) — o mesmo contrato documenta as Route Handlers em `src/app/api/v1/**`.
- **PWA/offline:** precache do shell; runtime cache stale-while-revalidate para `GET /me/meal-plans/active` e `GET /me/shopping-list`; rotas `/admin` e `/loja` excluídas do service worker (dados sensíveis, sempre frescos).
- **Orçamento de dados móveis:** meta < 200 KB de JS inicial na área do cliente (gzip); fontes com `display=swap` e subsets latinos; imagens conforme §4.
- **Server vs client components:** páginas do cliente são client components (interatividade + offline); tabelas admin/loja podem usar RSC com paginação por URL.
- **Backend no mesmo projeto:** `src/server/**` nunca é importado por código client-side (só pelas Route Handlers) — separação de camadas mantida por convenção de pastas, não por deploy separado.
- **i18n:** pt-PT único no MVP; strings centralizadas num módulo de mensagens para permitir futura tradução **[Sugestão]**.
