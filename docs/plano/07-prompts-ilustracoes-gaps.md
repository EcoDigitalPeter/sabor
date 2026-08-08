# 07 — Prompts de Ilustração: Gaps do Feedback do Cliente

> Estes prompts cobrem pontos novos de UI identificados numa análise de gaps entre o feedback do cliente e a app atual. A numeração continua diretamente de [`02-ui-ux-plan.md` §4](02-ui-ux-plan.md#4-prompts-para-geração-de-imagens-chatgpt) (que vai até P-07) e dos prompts da landing v2 (P-08..P-11, usados fora deste ficheiro — hero, galeria de pratos, ícones de benefícios, fundo do CTA), começando aqui em **P-12**. Aplicam-se as mesmas regras transversais já documentadas em `02-ui-ux-plan.md` §4: nada de fotografia realista de pessoas, nada de texto embutido na imagem, fundos transparentes ou cream `#F6ECDC`.

### P-12 — Ícones das tags de preferência alimentar

- **Contexto de uso:** conjunto de 6 ícones pequenos (tipo os ícones de categoria `P-06` da lista de compras, mesmo espírito) usados em dois sítios novos: (a) chips do novo passo "Preferências alimentares" no onboarding/perfil, (b) chips de filtro do novo catálogo de receitas navegável (`/receitas`). Pedir os 6 no mesmo pedido, como o P-06 já recomenda, para garantir consistência visual entre eles.
- **Estilo visual:** mesmo conjunto coerente de ícones de linha (stroke 2 px, cantos arredondados) do P-06, um único peso.
- **Formato/tamanho:** SVG (ou PNG 96×96), grelha 24×24, área de desenho 20×20.
- **Elementos que devem aparecer:** as 6 conceitos — vegetariana (folha/planta), vegan (broto/semente, distinto do de vegetariana), sem glúten (espiga cortada/riscada), sem lactose (gota de leite riscada), alta proteína (peixe ou grão, ecoa o ícone de proteína já usado no P-06), baixo teor calórico (chama pequena riscada ou uma balança discreta — evitar qualquer conotação negativa de peso, ver nota abaixo).
- **Elementos que NÃO devem aparecer:** preenchimentos sólidos, sombras, gradientes, texto, pessoas, balanças de casa de banho ou qualquer imagem associada a "dieta restritiva"/perda de peso (mesma sensibilidade já documentada no P-01 do `02-ui-ux-plan.md` sobre não usar fitas métricas/balanças/antes-depois).
- **Cores sugeridas:** stroke único ink `#241A14` (a app recolore por CSS, mesmo padrão do P-06).

### P-13 — Empty state "sem receitas para este filtro" (catálogo de receitas)

- **Contexto de uso:** no novo ecrã `/receitas`, quando os filtros/pesquisa aplicados não devolvem nenhuma receita. Tom diferente do empty state "ainda sem plano" (P-02, que é sobre antecipação/"ainda não chegou") — aqui é "não há resultados para isto", mais parecido com uma busca vazia.
- **Estilo visual:** mesma linguagem flat/orgânica dos outros empty states (P-02/P-04), mas com um elemento de "procura sem resultado" em vez de "espera".
- **Formato/tamanho:** 1:1, 600×600 px, fundo transparente.
- **Elementos que devem aparecer:** uma lupa estilizada orgânica (não geométrica/corporate) sobre um prato vazio ou vários pequenos pratos desfocados/tracejados ao fundo, sugerindo "procurámos mas não há nada com estes filtros exatos".
- **Elementos que NÃO devem aparecer:** texto, caras tristes, símbolos de erro (X vermelho, ponto de exclamação), qualquer coisa que pareça um erro do sistema — é uma ausência normal de resultados, não uma falha.
- **Cores sugeridas:** tan `#E7C9A0` e clay `#5B4A3A`, acento amber `#E3A72E` na lupa.

### P-14 — Selo de confiança do hero ("Grátis · sem cartão de crédito · 2 minutos")

- **Contexto de uso:** pequeno selo/ícone inline, imediatamente à esquerda do texto `.heroMicrocopy` já existente no hero da landing (`LandingPage.tsx`/`LandingPage.module.css`) — hoje esse texto já é um pill CSS âmbar/terracota, mas o cliente pediu especificamente **algo visual**, não só tipografia/cor. Não é um ícone utilitário genérico (seta/lixo/editar — esses continuam a vir do Lucide, regra do topo desta secção) — é uma ilustração de marca pontual, como P-01..P-13, porque reforça um momento de confiança específico da proposta de valor (gratuidade + rapidez), não uma ação de interface.
- **Estilo visual:** mesma linguagem flat/orgânica da marca (sem contornos pretos, formas geométricas suaves), tom celebratório mas contido — mais próximo do selo do P-05 (visto orgânico) do que de um ícone de sistema.
- **Formato/tamanho:** SVG, fundo transparente, viewBox quadrado (ex. 64×64) para ficar nítido a ~32-40 px de altura (o tamanho real de exibição, inline com o texto do pill).
- **Elementos que devem aparecer:** um pequeno selo/ribbon orgânico (círculo ou forma de selo com uma pequena "cauda" de fita, estilo emblema) com um visto (checkmark) simples ao centro — a ideia de "está confirmado, é seguro começar", não literalmente um cartão de crédito.
- **Elementos que NÃO devem aparecer:** um cartão de crédito literal riscado/cortado (evita a leitura "X não pode usar cartão" — o ponto é confiança/gratuidade, não a ausência de um objeto), texto/números, pessoas, símbolos de dinheiro (notas, moedas, cifrões), troféus/medalhas.
- **Cores sugeridas:** selo em amber `#E3A72E`/amber-soft `#F0BC55`, visto central em terracotta-dark `#A63417` (para contrastar bem sobre o fundo `--ink` do hero).

**Integração no código (preparar a estrutura, sem depender do ficheiro existir):** em `LandingPage.tsx`, o `<p className={styles.heroMicrocopy}>` passa a poder receber um `<img>` pequeno antes do texto, mesmo padrão já usado em `BenefitCards.tsx` para os ícones de benefício (`<img src="/images/..." alt="" aria-hidden="true" width={...} height={...} className={styles.heroMicrocopyIcon} />`). Enquanto o SVG não existir, fica um comentário `{/* TODO(P-14): ícone do selo de confiança — ver docs/plano/07-prompts-ilustracoes-gaps.md */}` no sítio exato, sem inventar um placeholder visual.

---

## Notas — o que NÃO precisa de prompt

- O botão "+ Adicionar item" da lista de compras (nova funcionalidade `F1-CLI-06B`) é um ícone utilitário (tipo "adicionar"/"+"), não uma ilustração — deve vir do Lucide (mesma regra já escrita em `02-ui-ux-plan.md` §4), sem prompt de geração.
- O dashboard `/inicio` (hub pós-login do cliente) foi revisto e **não tem nenhuma lacuna nova de ilustração** — já reaproveita `<BrandIllustration variant="empty-plan" />` (P-02) no seu único empty state (quando o cliente ainda não tem plano); o resto do ecrã é composto por cartões de resumo compactos (refeições de hoje, compras, encomendas, CTA "pedir receita agora") que não seguem o padrão de "ilustração grande" usado nos empty states — adicionar ilustração ali seria decoração sem função, contra o princípio já documentado de "ilustração leve e pontual" do `02-ui-ux-plan.md` §4.
