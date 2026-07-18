# P-10 — Ícones do quarteto de benefícios da landing v2

**Onde é usada:** `BenefitCards.tsx` (`src/components/landing/BenefitCards.tsx`) — hoje usa ícones Lucide (`Clock`, `Wallet`, `UtensilsCrossed`, `HeartPulse`) como fallback ship-ready; ao gerar as ilustrações, seguem o mesmo padrão de `icones-categorias` (SVG inline, `currentColor`, recolorável por CSS).
**Ficheiros esperados nesta pasta:** 4 SVG, viewBox 0 0 200 200, traço único (sem preenchimento sólido), na mesma linguagem visual do `BrandIllustration.tsx` (formas orgânicas/planas, sem texto, sem pessoas, sem fotorrealismo):

- `poupa-tempo.svg` — relógio orgânico (mostrador arredondado, ponteiros simples).
- `orcamento.svg` — moeda ou cesto de compras estilizado.
- `sabor.svg` — prato com talheres, ecoando o `BrandIllustration` "empty-plan".
- `saude.svg` — coração com uma folha, ecoando os motivos de folha já usados em `onboarding`/`onboarding-sucesso`.

## Prompt para colar no ChatGPT

> Cria um ícone de linha, estilo flat/orgânico, para representar **{conceito}** (ex.: "tempo poupado" → um relógio com traço arredondado e amigável). Traço único, espessura consistente (~4–5 px numa grelha 200×200), sem preenchimento sólido, sem gradientes, sem texto. Cores neutras (preto ou cinza-escuro) — a aplicação vai recolorir via CSS `currentColor`.
>
> Formato quadrado 1:1, 200×200 px, fundo transparente.
>
> NÃO incluir: texto, números, pessoas, robôs, gradientes, sombras complexas — mantém a mesma simplicidade das ilustrações já existentes em `public/images/onboarding` e `public/images/icones-categorias`.
