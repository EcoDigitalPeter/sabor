# Ottimizo — descrição do produto para design (Google Stitch)

> Este documento existe para alimentar uma ferramenta de design de UI por IA (Google Stitch) e obter sugestões de ecrãs. Cobre o produto completo: visão geral, as 4 personas e as suas funcionalidades esperadas, o mapa de ecrãs, o design system, a linguagem visual, conteúdo real de exemplo, componentes já existentes e onde o valor de novas sugestões é maior.

---

## 1. Visão geral do produto

**Ottimizo** é uma app web (mobile-first) de planeamento alimentar por inteligência artificial, feita para Moçambique. Gera planos alimentares semanais personalizados — com receitas de pratos moçambicanos reais (não comida genérica ocidental) — adaptados ao objetivo, condição de saúde, alergias, orçamento e nº de refeições/dia de cada pessoa, e produz automaticamente a lista de compras correspondente.

**Contexto que molda o design:**
- **Dados móveis caros e limitados** — a app tem de funcionar bem em rede fraca, com pouco peso de imagem/JS, e o dashboard principal funciona offline depois de carregado.
- **Comida real, não "dieta"** — os pratos são moçambicanos e reconhecíveis (xima, matapa, caril, feijão nhemba, mandioca), não pratos fitness genéricos.
- **Custo importa tanto como nutrição** — cada receita e a lista de compras mostram custo estimado em Meticais (MT), porque orçamento é um critério de decisão tão central quanto calorias.
- **Disclaimer transversal** — em qualquer ecrã com sugestão nutricional ou de saúde: "as sugestões não substituem aconselhamento médico ou nutricional." Nunca a app se apresenta como diagnóstico ou tratamento.
- **Tom visual:** editorial, caloroso, "feito à mão" — não corporate, não clínico, não gamificado com troféus/confetti/emojis exagerados.

---

## 2. As 4 personas

| Persona | Objetivo principal |
|---|---|
| **Visitante** | Perceber o produto (landing pública) e criar conta para aceder ao portal do cliente. |
| **Cliente** | Receber um plano alimentar semanal adequado ao seu objetivo, condição de saúde, gostos e orçamento — com receitas e lista de compras — gastando pouco dado móvel; a partir da Fase 3, encomendar o rancho a uma loja parceira. |
| **Administrador** | Manter os dados que alimentam a IA (receitas, ingredientes, nutrição), gerir clientes e o registo de lojas parceiras, acompanhar a utilização da plataforma. |
| **Lojista** | Manter o catálogo de produtos e preços da própria loja (manual ou por Excel) e gerir o estado das encomendas recebidas dos clientes — a entrega e o pagamento acontecem fora do sistema, diretamente entre loja e cliente. |

---

## 3. Funcionalidades esperadas, por persona

Legenda de estado: ✅ implementado e a funcionar (frontend contra mocks — o backend real, secção `BE-*`/`INT-*` do `docs/plano/tasks.md`, ainda está por ligar na maior parte dos casos) · 🎯 **planeado, ainda por desenhar/construir — é aqui que sugestões de ecrã novas trazem mais valor**.

### Visitante
- ✅ **Registo** — nome, email, password, aceite de disclaimer; entra autenticado e segue para onboarding.
- ✅ **Login** — email + password; o role da conta decide o destino (Cliente ou Admin); mensagem de erro genérica, sem distinguir "email não existe" de "password errada".
- 🎯 **Recuperação de password** — fluxo "esqueci-me da password" por email (fora do MVP, mas útil para desenhar já).

### Cliente
- ✅ **Perfil de saúde (onboarding)** — objetivo, condição de saúde, alergias, orçamento, nº refeições/dia; wizard 1-pergunta-por-ecrã.
- ✅ **Geração do plano por IA** — pedido assíncrono (10-30s), ecrã de espera com mensagens rotativas.
- ✅ **Consulta do plano semanal** — dashboard com os dias da semana e as refeições de cada dia.
- ✅ **Receita da refeição** — detalhe completo: foto, tempo, custo, macros, ingredientes, passos.
- ✅ **Feedback e troca de refeição** — 👍/👎 por receita; pedir alternativa e confirmar troca.
- ✅ **Lista de compras** — agregada por categoria, com checkbox de compra e "já tenho X" (ajusta quantidade/custo a comprar).
- ✅ **Encomendar rancho a uma loja parceira** — a partir da lista de compras, escolher loja ativa, rever itens, confirmar encomenda, acompanhar "Minhas encomendas".

### Administrador
- ✅ **Gestão de utilizadores** — listar/pesquisar/filtrar clientes, ver detalhe (incl. perfil de saúde, ação explícita e auditada), suspender/reativar conta.
- ✅ **Gestão de lojas parceiras** — CRUD de lojas (nome, cidade, contacto, estado).
- ✅ **Métricas de utilização** — dashboard com KPIs (utilizadores, planos gerados, taxa de sucesso da IA, custo estimado de IA), gráfico de planos/dia, top/bottom receitas por feedback.
- ✅ **Gestão do catálogo de receitas** — CRUD completo (nome, tempo, custo, tags de saúde, ingredientes, passos, macros calculados), fluxo de publicação (rascunho → publicado), feedback agregado por receita.
- ✅ **Gestão de ingredientes** — base nutricional (kcal, macros por 100g, preço de referência, categoria), edição inline, bloqueio de remoção se o ingrediente estiver em uso.

### Lojista
- ✅ **Catálogo de produtos da loja** — nome, categoria, unidade, preço em MT, estado.
- ✅ **Import/exportação em Excel** — upload `.xlsx`, pré-visualização com erros destacados, importar só linhas válidas, exportar catálogo atual.
- ✅ **Gestão de encomendas recebidas** — listar, ver detalhe (cliente, itens, nota), avançar o estado (aceitar/recusar/preparar/pronto).

---

## 4. Mapa de ecrãs e navegação

```
PÚBLICO                    PORTAL CLIENTE (mobile-first)          PORTAL ADMIN (desktop-first)
───────                    ─────────────────────────────          ─────────────────────────────
T-01 Login ──────────────▶ T-04 Dashboard do plano ◀──────┐       T-09 Dashboard de métricas ✅
  │  ▲                       │        │        │          │         │
  ▼  │ (logout)              ▼        ▼        ▼          │         ├─▶ T-10 Utilizadores ✅ ─▶ T-11 Detalhe ✅
T-02 Registo               T-05     T-06     T-08         │         ├─▶ T-12 Lojas ✅ ────────▶ T-13 Form loja ✅
  │                        Receita  Compras  Perfil       │         ├─▶ T-17 Receitas ✅ ─────▶ T-18 Form receita ✅
  ▼ (1ª vez)                 │        │                   │         └─▶ T-19 Ingredientes ✅
T-03 Onboarding ─────────▶ T-07 A gerar plano ────────────┘
                                      ▼ ("Encomendar")
                             T-20 Escolher loja ✅ ─▶ T-21 Rever encomenda ✅ ─▶ T-22 Minhas encomendas ✅

PORTAL DA LOJA (desktop-first) — frontend implementado (contra mocks; backend real por integrar)
──────────────────────────────────────
T-01 Login (mesmo ecrã, redireciona por role)
  ├─▶ T-23 Produtos da loja ✅ ──▶ T-24 Form produto ✅
  ├─▶ T-25 Import Excel (loja) ✅
  └─▶ T-26 Encomendas ✅ ─────────▶ T-27 Detalhe de encomenda ✅
```

**Navegação Cliente (mobile):** bottom-nav fixa com 3 itens — Plano · Compras · Perfil. Receita, "a gerar plano" e o fluxo de encomenda são ecrãs empilhados (botão voltar).
**Navegação Admin (desktop, funciona em tablet):** sidebar esquerda — Dashboard · Utilizadores · Lojas · Receitas · Ingredientes; topbar com nome do admin + logout.
**Navegação Loja (desktop):** sidebar esquerda — Produtos · Encomendas; topbar com nome da loja + logout.

**4 estados transversais em qualquer ecrã com dados remotos:**
| Estado | Padrão visual |
|---|---|
| Loading | Skeletons com a mesma geometria do conteúdo final — nunca um spinner de página inteira (exceção: ecrã de geração do plano, que é uma espera propositadamente ritualizada). |
| Vazio | Ilustração pequena (ver §6) + título + frase de ação + CTA primário. |
| Erro | Cartão com ícone, mensagem clara em português (sem stack traces), botão "Tentar novamente"; erros de formulário inline por campo. |
| Sucesso | Toast discreto (~2,5s) para ações rápidas; ecrã de confirmação para ações longas (registo, import Excel). |

### Objetivo de cada ecrã (uma linha)

| Ecrã | Objetivo |
|---|---|
| T-01 Login | Autenticar cliente ou admin/lojista; o role decide o destino. |
| T-02 Registo | Criar conta de cliente. |
| T-03 Onboarding | Recolher objetivo, condição de saúde, alergias, orçamento, refeições/dia. |
| T-04 Dashboard do plano | Consultar a semana e navegar para receitas/compras. |
| T-05 Detalhe da receita | Apresentar a receita completa e recolher feedback/pedido de troca. |
| T-06 Lista de compras | Rancho da semana agregado por categoria, com marcação durante a compra. |
| T-07 A gerar plano | Ocupar a espera da geração por IA (10-30s) com confiança. |
| T-08 Perfil | Ver/editar perfil de saúde; terminar sessão. |
| T-09 Dashboard admin | Visão de métricas de utilização da plataforma. |
| T-10/T-11 Utilizadores | Listar/pesquisar clientes; ver detalhe e agir sobre o estado da conta. |
| T-12/T-13 Lojas | Catálogo de lojas parceiras; criar/editar loja (+ conta do lojista). |
| T-17/T-18 Receitas | Curar o catálogo de receitas que alimenta a IA; publicar. |
| T-19 Ingredientes | Manter a base nutricional usada pelas receitas. |
| T-20/T-21/T-22 Encomenda | Escolher loja → rever/confirmar itens → acompanhar encomendas. |
| T-23/T-24 Produtos da loja | Catálogo de produtos e preços da própria loja. |
| T-25 Import Excel (loja) | Importação em massa do catálogo. |
| T-26/T-27 Encomendas (loja) | Listar pedidos recebidos e avançar o seu estado. |

---

## 5. Design system

### Cores

| Token | Hex | Uso |
|---|---|---|
| `cream` | `#F6ECDC` | Fundo base da app (claro) |
| `cream-card` | `#FFFFFF` | Cartões sobre cream |
| `cream-card-alt` | `#FBF5EA` | Cartões alternativos, inputs |
| `ink` | `#241A14` | Texto principal; fundos de secções escuras (hero, nav admin) |
| `ink-soft` | `#2F231B` | Cartões sobre ink |
| `terracotta` | `#C43E1C` | Cor primária de ação (CTA principal, marca); proteína no anel de macros |
| `terracotta-dark` | `#A63417` | Hover do CTA |
| `amber` | `#E3A72E` | Destaques, eyebrows; carboidratos no anel de macros |
| `amber-soft` | `#F0BC55` | Hover amber |
| `forest` | `#45614A` | Positivo/sucesso; fibra no anel de macros |
| `clay` | `#5B4A3A` | Texto secundário sobre claro |
| `clay-soft` | `#8A7A65` | Texto terciário / labels |
| `tan` | `#E7C9A0` | Chips, cartões de destaque; gordura no anel de macros |
| erro | `#C43E1C` (mesmo terracotta) | Mensagens de erro |

### Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Display | **Bricolage Grotesque** (400–800) | Títulos, nomes de pratos, KPIs |
| Corpo | **Work Sans** (400–700) | Texto, formulários, botões |
| Mono | **IBM Plex Mono** (500–600) | Números: kcal, macros, preços (MT), códigos |

### Forma e movimento

- Botões/CTAs em pílula (`border-radius: 100px`); cartões `12–24px`; inputs `10px`.
- Foco visível sempre (acessibilidade): contorno `3px` — amber sobre fundo escuro, terracotta sobre fundo claro.
- Animações discretas e só duas: entrada de blocos (fade + subir 14px, 0,4-0,6s) e o anel de macros a desenhar-se (scale + rotate). Nada de motion decorativo além disto.
- **Cliente e público:** mobile-first, desenhado a partir de 360px, tipografia fluida com `clamp()`.
- **Admin e Loja:** desktop-first, mas tem de funcionar em tablet (são ferramentas de trabalho, usadas em ecrã maior).

### Componente-assinatura: Anel de Macros

Anel circular (SVG), 4 segmentos, **sempre nesta ordem e com estas cores**: Proteína `#C43E1C` → Carboidratos `#E3A72E` → Gordura `#E7C9A0` → Fibra `#45614A`, com o total de kcal ao centro em IBM Plex Mono. É o elemento visual mais reconhecível da marca — aparece em cartões de refeição (pequeno), resumos (médio) e no detalhe da receita (grande, com legenda). Qualquer ecrã novo que mostre macros deve reutilizar este padrão, não inventar outro gráfico.

---

## 6. Linguagem visual das ilustrações

Ilustração é usada com moderação — o peso visual da app vem da tipografia e da cor, não de imagens decorativas. Regras que qualquer ilustração nova tem de respeitar:

- **Nunca:** fotografia realista de pessoas, texto/números/logótipos embutidos na imagem, robôs/cérebros/circuitos/chatbots (a IA deve ser invisível no visual), troféus/confetti/polegares para cima, balanças de casa de banho, fitas métricas, imagens "antes/depois" (sensibilidade em torno de peso corporal).
- **Sempre:** estilo flat minimalista, traço orgânico, sem contornos pretos — estética "editorial calorosa", nunca corporate nem cartoon infantil. Paleta restrita às cores da secção 5, sobre fundo cream ou transparente. Ficheiros leves (SVG preferível; PNG só se necessário, <60KB) por causa do orçamento de dados móveis.
- **Ilustrações já existentes** a reaproveitar como referência de estilo: onboarding (prato moçambicano estilizado + símbolos de objetivo em círculo), "ainda sem plano" (prato vazio + silhuetas tracejadas de comida), ecrã de geração (anel de macros incompleto + ícones de ingredientes a orbitar), "ainda sem lista de compras" (cesto de mercado moçambicano tecido), sucesso do onboarding (anel fechado + check orgânico), 6 ícones de categoria (cereais=milho, proteína=peixe, vegetais=couve, leguminosas=feijão nhemba, temperos=pilão/malagueta, outros=cesto — traço 2px, uma só cor recolorável), banner do dashboard admin (padrão abstrato de arcos do anel, baixa opacidade, sobre fundo ink). O logótipo (anel de 2 arcos) já existe — não gerar de novo.

---

## 7. Conteúdo real de exemplo (para gerar ecrãs com dados realistas)

**Pratos moçambicanos que aparecem na app** (não usar comida genérica/ocidental nos mockups): Papinha de amendoim com banana, Xima suave com feijão nhemba, Xima com matapa e camarão, Feijão nhemba com arroz e couve, Caril de peixe (garoupa) com arroz, Frango à zambeziana com arroz e salada, Arroz de coco com feijão jugo, Mandioca cozida com molho de amendoim e folhas, Salada de quiabo com xima e ovo, Caril de galinha com batata-doce, Peixe grelhado com legumes salteados, Matapa de amendoim, Badjias de feijão nhemba, Mucapata, Couve refogada com amendoim.

**Forma de uma receita** (usar nos mockups de cartão/detalhe): nome, kcal, tempo de preparação (min), custo estimado (MT — pode ser `null`, e nesse caso a UI mostra "estimativa parcial"), macros (proteína/carboidratos/gordura/fibra em gramas ou %), tags de saúde (ex.: `vegetariana`, `sem_gluten`, `açúcar_controlado`, `baixo_sódio` — pode estar vazio), lista de ingredientes (quantidade + unidade + nome), passos numerados, nota de saúde opcional (ex.: "Baixo em sódio — recomendado para hipertensão, sempre com acompanhamento médico").

**Categorias da lista de compras:** Cereais e farinhas, Proteína, Vegetais e folhas, Leguminosas, Temperos e óleos, Outros.

**Cenários "para quem é"** (útil para copy de marketing/onboarding): perder peso, ganhar massa muscular, diabetes tipo 2, hipertensão.

---

## 8. Componentes reutilizáveis já existentes

Não é preciso desenhar do zero — a app já tem uma biblioteca de componentes que qualquer ecrã novo deve reaproveitar: `Button`, `Input`, `Select`, `Checkbox`, `FormField` (label + erro), `Card`, `Chip`, `StatusBadge`, `Toast`, `Modal`, `ConfirmDialog`, `BottomSheet` (folha modal mobile, usada na troca de refeição), `Skeleton`, `EmptyState`, `ErrorState`, `OfflineBanner`, `Wizard` (multi-passo, usado no onboarding), `DataTable` (tabela admin paginada com pesquisa/filtro/ordenação), `KpiCard`, `LineChart` (gráfico leve de métricas), `CategoryIcon` (ícones de categoria da §6), `BrandIllustration` (renderiza as ilustrações da marca), e o **Anel de Macros** (§5).

---

## 9. Onde o valor de novas sugestões de design é maior

**Já construído e a funcionar bem** (usar como referência de tom/qualidade, não como algo a redesenhar): toda a landing pública, todo o Portal do Cliente (T-01 a T-08 e o fluxo de encomenda T-20/T-21/T-22, incluindo o dashboard foto-primeiro das refeições e a lista de compras com "já tenho X"), o dashboard de métricas do Admin (T-09) e as restantes telas de gestão do Admin (T-10/T-11 Utilizadores, T-12/T-13 Lojas, T-17/T-18 Receitas, T-19 Ingredientes), e o Portal da Loja completo (T-23 a T-27). Todo este frontend está implementado contra mocks — o trabalho que falta é sobretudo ligar ao backend real (`BE-*`/`INT-*` em `docs/plano/tasks.md`), não desenhar ecrãs novos.

**Onde sugestões de ecrã/UX novas ainda trazem mais valor:** polimento visual e de copy contínuo nas telas de gestão do Admin/Loja (aplicar o mesmo design system caloroso/editorial, não um admin genérico cinzento, a interfaces densas de dados) e qualquer novo gap identificado em rondas de feedback do cliente (ver `docs/plano/06-guia-de-copy-e-marca.md` e a faixa `FE-Y` em `docs/plano/tasks.md` para a ronda mais recente).
