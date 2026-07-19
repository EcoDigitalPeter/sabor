# MealCard — layout único compacto, inspirado no mock do Stitch (T-04 Dashboard do Plano)

**Data:** 2026-07-19
**Estado:** aprovado, pronto para plano de implementação

## Contexto

O Stitch MCP gerou um ecrã "T-04 Dashboard do Plano" (mesmo projeto "Solution Prototype Development"). O `descricao.md` §9 marca este ecrã como **já construído e a funcionar bem** — "usar como referência de tom/qualidade, não como algo a redesenhar". O mock do Stitch não substitui o dashboard atual (`(cliente)/plano/page.tsx`); dele extrai-se apenas um ponto de polimento pontual e aprovado: o layout do cartão de refeição.

**Pontos do mock avaliados e não adotados:**
- Avatar circular do utilizador no cabeçalho — sem dados de foto de perfil no MVP.
- Seta de "voltar" no cabeçalho — Plano é separador raiz da bottom-nav, não ecrã empilhado.
- Day-picker do mock — já equivalente ao `DayTabs` atual (pill dia+data, ativo preenchido, indicador de "hoje"); nada de novo a copiar.
- Disclaimer fixo acima da bottom-nav e destaque do item ativo na bottom-nav — avaliados, mas não escolhidos para este ciclo.

## MealCard — layout único (miniatura + anel flutuante)

**Ficheiros:** `levesabor-web/src/components/plan/MealCard.tsx`, `MealCard.module.css`.

Hoje o `MealCard` tem dois modos: `cardWithPhoto` (foto 16:9 cheia, overlay gradiente com texto sobre a foto, `MacroRing` num badge circular absoluto no canto) e o modo sem foto (linha simples: texto à esquerda, `MacroRing` à direita). Passa a haver **um único layout**, sempre uma linha horizontal:

- Miniatura quadrada (~84px), cantos arredondados (`var(--radius-card)` ou equivalente pequeno), à esquerda. Com foto (`getRecipePhoto`), mostra a foto (`object-fit: cover`); sem foto, cai num placeholder simples com fundo `var(--cream-card-alt)`, sem overlay nem gradiente.
- Coluna de texto ao centro (`flex: 1`, `min-width: 0`): label da refeição (`slot`, maiúsculas, pequeno, como hoje), nome da receita (`font-display`, como hoje), e uma linha com ícone de relógio (lucide `Clock`, tamanho pequeno) + `"{prepMinutes} min"`. **Deixa de existir** o `Chip` de texto "kcal · min" — o kcal já está no centro do `MacroRing`, não se repete.
- `MacroRing` (`size="sm"`) como último item da linha, `flex: none`, alinhado ao centro verticalmente — item flex normal, **não** `position: absolute` (o mock usa absolute porque o cartão dele é uma foto de fundo; aqui não há fundo a cobrir, por isso o layout flex simples é mais robusto a variações de altura de conteúdo).

**Remove-se:** `styles.cardWithPhoto`, `styles.photoWrap`, `styles.photo`, `styles.ringBadge`, `styles.overlay`, `styles.slotOnPhoto`, `styles.nameOnPhoto` e toda a lógica condicional `photoSrc ? (...) : (...)` no componente — um único caminho de render.

**Trade-off assumido:** perde-se o tratamento "foto-primeiro" (comentário `FE-Q02` no código atual — foto grande com overlay era uma escolha deliberada de impacto visual). Ganha-se consistência de um único layout e menor peso de imagem (miniatura pequena vs. foto 16:9 cheia) — relevante para o orçamento de dados móveis descrito no `descricao.md`.

## Fora de escopo (avaliado, não escolhido)

- Disclaimer em itálico centrado, fixo acima da bottom-nav, depois da lista de refeições do dia.
- Destaque do item ativo na bottom-nav (`scale(1.1)` + ícone preenchido).
- Qualquer alteração ao cabeçalho da página (`greeting`, título) ou ao `DayTabs`.

## Critérios de verificação

- O `MealCard` renderiza de forma idêntica com e sem foto disponível (só muda o conteúdo da miniatura, não a estrutura).
- Nenhuma alteração de dados/props — mesma `MealCardProps` (`entry`, `href`, `onClick`, `className`).
- O anel de macros continua a mostrar o kcal corretamente centrado, tamanho `sm` (44px), sem alterações ao componente `MacroRing`.
- Layout responsivo: testar em mobile (largura ~360px) e não só em desktop — o dashboard é mobile-first.
- Skeleton de loading (`MealCardSkeleton` em `plano/page.tsx`) continua a bater com a geometria nova do cartão (regra "loading = skeleton com a mesma geometria do conteúdo final", `descricao.md` §4) — pode precisar de ajuste.
- `npm run build` (ou equivalente) sem erros novos; revisão visual manual no browser (dev server) no dashboard `/plano` antes de dar como concluído.
