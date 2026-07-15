# Landing page pública — design

**Data:** 2026-07-14
**Estado:** aprovado, pronto para plano de implementação

## Contexto e motivação

A app (`levesabor-web`) não tem nenhuma página pública — `/` faz sempre `redirect()` (para `/login`, `/plano` ou `/admin` consoante a sessão). O design de referência (`project/Leve Sabor AI.dc.html`) é uma landing pública completa (hero com mini-quiz interativo, "Como funciona", exemplos de pedido, showcase de macros, "Para quem é", "Confiança", FAQ, CTA final, footer) que nunca chegou a ser implementada.

`docs/plano/01-functional-plan.md` (linha 804, tabela FUT) documenta isto como **FUT-04**, explicitamente fora da cotação aprovada pelo cliente atual ("a cotação cobre os dois portais, não a landing") e agendada para depois da Fase 3 (`05-implementation-roadmap.md` linha 169).

**Decisão do utilizador:** antecipar este trabalho, fora da cotação, em paralelo à Fase 1 em curso — não esperar pela Fase 3. `tasks.md` e os dois documentos de plano acima devem ser atualizados para refletir isto (ver secção "Documentação" abaixo), para não ficarem a contradizer o que está a ser feito.

## Âmbito

**Dentro do âmbito:**
- Página pública em `src/app/page.tsx`, visível a visitantes sem sessão.
- Réplica pixel-a-pixel do layout/copy/animações do `.dc.html`, com as alterações de conteúdo listadas abaixo.
- Mini-quiz interativo do hero e acordeão do FAQ, recriados em React (não é cópia do `sc-if`/`sc-for`/`DCLogic` — ver "Arquitetura").
- Reaproveitamento máximo da biblioteca de componentes já construída (`MacroRing`, `Chip`, `Button`) e dos design tokens (`styles/tokens.css`) em vez dos inline-styles do ficheiro original.

**Fora do âmbito (não fazer):**
- Qualquer persistência em BD ou endpoint de backend — não existe formulário de waitlist nesta versão, logo não há "decidir se a waitlist persiste na BD" (a nota do FUT-04 original) para resolver.
- Automatizar entrega ao domicílio ou pagamento in-app (isso é FUT-01, continua no backlog pós-Fase 3).
- Qualquer alteração aos portais Cliente/Admin existentes.

## Arquitetura e routing

`src/app/page.tsx` deixa de fazer `redirect()` incondicional:
- **Sem sessão** → renderiza a landing pública (Server Component).
- **Com sessão** → mantém o comportamento atual: `CLIENTE` → `/plano`, `ADMIN` → `/admin`.

A landing vive fora dos grupos de rotas `(auth)`/`(cliente)`/`admin` — não tem bottom-nav nem sidebar, tem o seu próprio nav/footer.

Limitação aceite (igual à já existente nas guardas de `(cliente)`/`admin`): a guarda em `page.tsx` é Server Component e `getSession()` só reflete sessão em memória do browser — sem hidratação server-side ainda (`FE-A03`). Não é regressão desta feature.

**Padrão de implementação:** Server Component + duas "ilhas" client, em vez de portar a página inteira como um único client component (o que hidrataria secções estáticas desnecessariamente e prejudicaria o first paint — a métrica mais importante numa landing) e em vez de forçar a interatividade em CSS puro (frágil para o anel de macros, cujo `stroke-dasharray` depende de dados calculados).

- `src/components/landing/HeroQuiz.tsx` (`"use client"`) — mini-quiz de 2 perguntas → resultado com `MacroRing`. Estado local: `step`, `goal`, `condition`.
- `src/components/landing/FaqAccordion.tsx` (`"use client"`) — acordeão, um item aberto de cada vez.
- Restantes secções: JSX estático dentro de `src/app/page.tsx` (não justificam componentização — usados uma única vez).
- `src/components/landing/LandingNav.tsx` — pode ser estático (Server Component); só tem um link, sem estado.

## Estrutura da página

| Secção do `.dc.html` | Implementação | Tipo |
|---|---|---|
| Nav sticky | `LandingNav` — logo SVG (reaproveitado tal qual) + CTA "Criar conta" → `/registo` | estático |
| Hero | Texto/CTAs estáticos + `<HeroQuiz />` | **client** |
| Como funciona | Grid de 5 passos (step 05 reformulado, ver copy) | estático |
| Exemplos de pedido | Grid de cards com chips (`Chip`) | estático |
| Macros (showcase) | Bloco escuro com `MacroRing lg` + legenda | estático |
| Para quem é | Grid de cenários | estático |
| Confiança | Texto a duas colunas | estático |
| FAQ | `<FaqAccordion />` | **client** |
| CTA final | Bloco "Criar a minha conta grátis" → `/registo` | estático |
| Footer | Contacto + disclaimer legal (igual ao original) | estático |

## Alterações de copy face ao design original

| Elemento | Original | Novo |
|---|---|---|
| Badge do hero | "Em breve · acesso antecipado" | Removido, sem substituto (o hero funciona bem só com título/subtítulo/CTAs) |
| CTA nav | "Entrar na lista" → `#waitlist` | "Criar conta" → `/registo` |
| CTA hero secundário | "Cria o teu plano de exemplo" → `#demo` | Mantém-se (aponta para o quiz interativo) |
| Resultado do quiz | Botão "↺ Experimentar outra vez" | Mantém-se + novo CTA "Criar a minha conta" → `/registo` |
| Passo "05 · Receba as compras em casa" | Entrega ao domicílio | Reformulado: "Encomenda à loja parceira" — passa a lista para uma encomenda e combina entrega/pagamento diretamente com a loja (alinhado com `F3-CLI-07`, sem prometer automação que não existe) |
| Secção CTA final ("waitlist") | Formulário nome+contacto → confirmação | Botão único "Criar a minha conta grátis" → `/registo`, sem formulário |
| FAQ | 4 perguntas (dados/offline/nutricionista/cozinha) | Mantém-se tal qual — ainda verdadeiro para o produto atual |
| Footer/disclaimer | — | Mantém-se tal qual |

Toda a lógica de `waitlistName`/`waitlistContact`/`waitlistError`/`waitlistSubmitted` do `.dc.html` original é eliminada — não há formulário nem submissão nesta versão, só CTAs de navegação para `/registo`.

## Testes/QA

- **Manual/visual**: comparação lado a lado com o `.dc.html` (via `support.js`) em desktop e mobile — cores, espaçamento, tipografia, animações `ls-rise`/`ls-ring-in`.
- **E2E (Playwright)**: visita `/`, interage com o quiz (2 cliques), confirma resultado (prato/anel), clica "Criar a minha conta" → confirma navegação para `/registo`; testa o acordeão do FAQ; confirma que sessão `CLIENTE`/`ADMIN` mockada é redirecionada a partir de `/` (não vê a landing).
- **Lighthouse/perf** (mobile, throttled) — é a página de entrada pública, vale a pena medir explicitamente, alinhado com o objetivo de bundle leve já estabelecido (`FE-E02`).

## Documentação a atualizar

- **`tasks.md`**: novo cartão `FE-P01 · Landing page pública` (novo grupo `FE-P`), `[deps: FE-A02, FE-B02, FE-B05]` `[ref: 01 FUT-04, project/Leve Sabor AI.dc.html]`.
- **`01-functional-plan.md`**: mover a entrada `FUT-04` da tabela de backlog, com nota a indicar que foi antecipada como `FE-P01`, fora da cotação original.
- **`05-implementation-roadmap.md`**: remover `FUT-04` da lista "depois da Fase 3" (linha 169), com a mesma nota de contexto.
