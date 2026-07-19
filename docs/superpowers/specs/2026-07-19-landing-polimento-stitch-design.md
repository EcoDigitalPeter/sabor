# Landing pública — polimento inspirado no mock do Stitch

**Data:** 2026-07-19
**Estado:** aprovado, pronto para plano de implementação

## Contexto

O Stitch MCP (projeto "Solution Prototype Development", ecrã "Landing Page Pública") gerou uma sugestão de landing usando o nosso design system ("Warm Mozambican Editorial"). A landing atual (`levesabor-web/src/components/landing/LandingPage.tsx`) já é mais completa que o mock — tem `HeroQuiz` interativo, `ProofStrip`, exemplos de pedido/resposta, cenários "para quem é", secção de confiança/visão e FAQ, nenhum dos quais o Stitch desenhou. O mock não é um substituto; é material de polimento visual pontual.

Deste mock, três ideias foram aprovadas para incorporar na landing atual (as restantes — layout do cartão de receita, "como funciona" minimalista, CTA em bloco de cor sólida — ficam fora de escopo por agora):

1. Hero com fotografia editorial de fundo + selo "Sugestão do Dia", mantendo o `HeroQuiz` como elemento interativo principal, sobreposto à foto.
2. Sombra subtil na nav ao fazer scroll.
3. Disclaimer médico do rodapé em destaque, como citação, junto à marca.

**Explicitamente rejeitado do mock:** a frase "Junte-se a milhares de moçambicanos que já estão a transformar a sua saúde..." — alegação de tração inventada, contradiz a posição documentada em `descricao.md` §9 ("ainda sem utilizadores, sem promessas infladas").

## 1. Hero — foto de fundo + quiz sobreposto

**Ficheiros:** `LandingPage.tsx`, `LandingPage.module.css`, `HeroQuiz.module.css` (ajuste do fundo do cartão).

- A imagem `public/images/hero-prato/hero-prato.webp` (já existe, 263KB, atualmente usada como círculo decorativo `.heroDish`) passa a preencher a coluna direita da hero em largura/altura total, `border-radius: 2rem`, `object-fit: cover`, com um gradiente escuro (`linear-gradient` transparente → preto ~40%) sobreposto na base para garantir legibilidade do que fica por cima.
- O `HeroQuiz` (`#demo`) deixa de ter fundo opaco (`var(--ink-soft)`) e passa a ter um fundo semi-transparente com `backdrop-filter: blur(...)` (efeito vidro), ancorado à parte inferior da foto — mesma lógica/estado interno, sem alterações de comportamento.
- Um selo estático novo, pequeno, ancorado no topo da foto (acima do cartão do quiz): ícone sparkle + "Sugestão do Dia" + nome de um prato fixo (ex.: "Matapa com Caranguejo e Xima"). Não interativo, não liga a nada — é só reforço visual do ângulo IA.
- **Breakpoint:** o tratamento de foto grande só se aplica ≥1024px, seguindo o precedente já existente no código (`.heroDish` já é `display:none` abaixo de 1024px). Em mobile, a hero mantém-se exatamente como está hoje — só o quiz, largura total, sem a foto — para não aumentar o peso de dados em mobile.
- Sem novos assets — reutiliza a imagem já existente.

## 2. Nav — sombra ao scroll

**Ficheiros:** `LandingNav.tsx`, `LandingNav.module.css`.

- `LandingNav` já tem `scrolled` (threshold 400px) para dar ênfase ao CTA. Adicionar um segundo estado, `hasShadow`, com threshold baixo (~20px), que aplica uma classe com `box-shadow` subtil ao `<nav>`.
- Não mexer na altura do nav (o mock encolhe `h-16→h-14`; fica fora de escopo para não arriscar o alinhamento do logótipo/CTA existente).

## 3. Rodapé — disclaimer em destaque

**Ficheiros:** `LandingPage.tsx`, `LandingPage.module.css`.

- O disclaimer médico (hoje `<p className={styles.footerDisclaimer}>`, fora do `.footerTop`, depois do grid de colunas) move-se para dentro da coluna `.footerBrand`, junto ao wordmark e à `.footerTagline` — mesmo texto legal, sem alteração de conteúdo.
- Estilo: itálico, cor ligeiramente mais clara que o texto normal do rodapé, para ler como citação — não é preciso aspas literais, o itálico + posição já comunica isso.
- O parágrafo antigo (`.footerDisclaimer` fora de `.footerTop`) é removido — não fica duplicado.

## Fora de escopo (explicitamente adiado)

- Redesign do cartão de receita (`DishGallery`) com badge de tempo sobre a foto e tags ao lado do anel de macros.
- Redesign de "Como funciona" para círculos numerados + linha de ligação.
- CTA final em bloco de cor sólida terracotta (mantém-se o cartão `tan` texturado atual).

## Critérios de verificação

- Hero: em desktop (≥1024px), a foto enche a coluna direita com cantos arredondados, o quiz está legível sobre ela (contraste suficiente), e o selo "Sugestão do Dia" não sobrepõe nem o quiz nem o texto. Em mobile (<1024px), o visual é idêntico ao atual (sem foto).
- Nav: sombra aparece perto do topo do scroll (~20px) e desaparece ao voltar ao topo; não há salto de layout quando `ctaEmphasis` (400px) também ativa.
- Rodapé: disclaimer médico aparece uma única vez, dentro da coluna da marca, com estilo de citação.
- Nenhuma alteração de comportamento do `HeroQuiz` (lógica do quiz/freeform intacta).
- `npm run build` (ou equivalente) sem erros novos; revisão visual manual no browser (dev server) em mobile e desktop antes de dar como concluído.
