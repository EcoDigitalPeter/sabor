# 06 — Guia de Copy e Marca

> Destilado das rondas de feedback do cliente — inicialmente sobre a landing pública (`feedback/feedback1..5.{png,txt}`, julho 2026), estendido a partir de agosto 2026 (`feedback/feedback.txt`) a uma ronda que cobre praticamente toda a jornada (registo, onboarding, dashboard do plano, "pedir receita agora", lista de compras, escolha de loja). Não é um documento de brand book completo — é o conjunto de regras que já causaram correção real pelo menos uma vez, para não se repetir o mesmo erro em copy nova. Aplica-se a qualquer texto voltado ao utilizador, em qualquer ecrã.

---

## 1. Nunca limitar o alcance da marca

Evitar frases que soem a "isto só serve para X" — geografia, doença, tipo de prato. O cliente tem visão internacional para o produto; texto que soe exclusivo a Moçambique, a uma doença específica, ou a "pratos que já conheces" (implicitamente só os de sempre) foi corrigido em três rondas de feedback distintas.

- ❌ "Comida moçambicana de verdade." / "Feito em Moçambique, para Moçambique." / "Pratos 100% locais."
- ✅ "Alimentação inteligente, pensada para ti." / "Criado em Moçambique, pensado para o mundo." / "Pratos reconhecíveis."

**Como aplicar:** ao escrever um título ou claim novo, perguntar "isto soa a que só serve para um tipo de pessoa/lugar/prato?" Se sim, reformular para incluir sem excluir.

## 2. Honestidade acima de aspiração

`ProofStrip.tsx` já documenta esta regra para a faixa de prova social ("só afirmações verificáveis sobre o que o produto É, hoje") — este guia formaliza-a para **toda** a copy, não só ali. Nunca prometer o que o catálogo/produto não tem hoje.

- O catálogo de receitas é 100% moçambicano (seed real, `DB-05`). Não escrever "receitas internacionais", "cozinha do mundo" ou equivalente enquanto isso não for verdade — mesmo que a regra 1 acima peça para não soar exclusivo. A correção certa é tirar o tom de exclusividade permanente ("100% locais" → "reconhecíveis"), não inventar abrangência.
- Antes de publicar um claim novo, perguntar: "isto é verdade hoje, ou é uma promessa de roadmap disfarçada de facto?"

## 3. Saúde é um motivo entre vários, não o único

Sempre que se mencionar condição de saúde (diabetes, hipertensão, celíaca…), mencionar também objetivo/preferências no mesmo fôlego — para não soar que a app só serve quem tem uma doença diagnosticada.

- ❌ "Diabetes, hipertensão, celíaca: planos que respeitam a tua condição."
- ✅ "Planos adaptados à tua condição, preferências e objetivos."

## 4. Verbos ativos e simples

Preferir "cria", "gera", "prepara" a verbos técnicos/frios como "devolve". O produto fala com quem o usa, não descreve uma API.

## 5. Rótulos idênticos em toda a app

Um objetivo, condição ou conceito tem **um único** label em pt-PT, usado sem variação em landing, onboarding, perfil e qualquer outro ecrã. `01-functional-plan.md` (F1-CLI-01) já trava isto como critério de aceitação — os 4 objetivos e as 4 condições existem "exatamente com esses labels" onde quer que apareçam.

- Exemplo aplicado: "Perder peso" → "Emagrecer" mudou em 5 ficheiros ao mesmo tempo (`HeroQuiz.tsx`, `LandingPage.tsx`, `onboarding/page.tsx`, `perfil/page.tsx`, `plano/pedir-agora/page.tsx`) — nunca só na landing.
- Não existe i18n/copy central no projeto (cada secção guarda o seu próprio array local) — por isso esta consistência é responsabilidade de quem edita, não de uma abstração de código. Ao mudar um label, grep pelo texto atual no repo inteiro antes de dar como terminado.

## 6. Argumentos de confiança merecem destaque visual

"Grátis · sem cartão de crédito · 2 minutos" é um argumento de confiança, não uma legenda menor — deve ter peso visual próprio (badge/pill, cor de destaque), não só ser mais uma linha de texto pequeno.

---

## 7. Assistente inteligente, não "aplicação de receitas"

Uma segunda ronda de feedback (`feedback6..15`) repetiu e intensificou a regra 1 ao ponto de pedir a remoção de nomes de pratos específicos até do subtítulo do hero (não só de títulos de secção) — o padrão "isto só serve para X" aplica-se a qualquer menção a "Moçambique"/pratos concretos em copy de posicionamento (hero, secção de confiança, CTA final, footer), não só a títulos de secção. A mesma ronda pediu explicitamente para reposicionar a comunicação de "aplicação de receitas" para "assistente inteligente de alimentação" — o produto ajuda a decidir o que comer, o que comprar e como organizar a alimentação, não é uma base de receitas estática.

- **Como aplicar:** em copy de posicionamento (hero, proof strip, secção de confiança, CTA final, footer), preferir "receitas reais" a listar pratos específicos por nome. Nomes de pratos concretos (matapa, xima…) ficam bem em conteúdo que já é claramente ilustrativo/exemplo (galeria de pratos, exemplos de pedidos, badge de "sugestão do dia") — aí não são uma promessa da marca, são um exemplo real de output.
- Ao escrever sobre o que a IA faz, preferir verbos de assistência ativa ("ajuda a decidir", "planeia", "organiza") a descrições passivas de catálogo.

## 8. Um caso concreto de honestidade vs. inclusão (regras 1 e 2 em tensão)

A FAQ "Posso escolher o tipo de cozinha que prefiro?" é um exemplo direto da tensão entre a regra 1 (não soar limitado) e a regra 2 (não prometer o que não existe): o cliente pediu uma resposta que menciona "cozinhas internacionais", mas isso não é verdade hoje (catálogo 100% moçambicano). A resposta publicada resolve isto com uma promessa de crescimento honesta ("o catálogo cresce com o tempo") em vez de afirmar uma abrangência atual que não existe. Usar este padrão sempre que um pedido do cliente colidir com o estado real do produto: manter a inclusão na intenção, sem inventar o facto.

## 9. Português de Portugal, sem acordo ortográfico

Instrução explícita do cliente (agosto 2026), aplicável a todo o projeto, não só a copy nova: toda a escrita voltada ao utilizador — e também a documentação interna — é em português europeu, na grafia anterior ao Acordo Ortográfico de 1990 (ex.: manter consoantes mudas onde a norma pré-acordo as mantinha). Não é português do Brasil nem a grafia pós-acordo.

- **Como aplicar:** ao rever ou escrever copy, confirmar a grafia pré-acordo em caso de dúvida pontual em vez de assumir a forma pós-acordo (mais comum em correctores automáticos/IA, que tendem a "normalizar" para pós-acordo).

## 10. Ações seguras e reversíveis não soam a destrutivas

Um botão que só pede outra sugestão, ou que substitui algo sem perda real, não deve usar vocabulário de apagar/perder. O cliente corrigiu isto em vários pontos distintos da mesma ronda (resultado de "pedir receita agora", "gerar novo plano" no dashboard).

- ❌ "Descartar" (ao pedir outra receita) · "Gerar novo plano" (ao pedir novas sugestões, soa a apagar o plano todo).
- ✅ "Gerar outra receita" / "Quero outra sugestão" · "Quero outras sugestões" / "Criar outro plano".
- **Como aplicar:** antes de nomear um botão de ação, perguntar "isto perde alguma coisa do utilizador, ou só pede uma alternativa?" Se for só alternativa, o texto tem de soar reversível.

## 11. Contexto antes de pedir

Qualquer pergunta invulgar, longa, ou sobre um dado sensível (saúde, composição do agregado familiar, orçamento) ganha uma frase curta de "porquê estamos a perguntar isto" antes ou ao lado do campo — não deixar o utilizador a adivinhar a relevância.

- Exemplo já corrigido: "Usamos isto para ajustar as quantidades da lista de compras" → "Usamos esta informação para ajustar **automaticamente** as quantidades da tua lista de compras" (o "automaticamente" também reforça o valor da app, não é só clareza).
- **Como aplicar:** ao desenhar um novo campo de formulário fora do óbvio (nome, email, password), escrever sempre a frase de contexto antes de considerar o passo terminado.

## 12. Valores acima de labels na hierarquia visual

Quando um ecrã mostra pares rótulo→valor (ex. "Refeição: Almoço", "Objectivo: Controlar uma condição de saúde"), o valor concreto é a informação que importa — tem de ganhar peso visual ao rótulo genérico, não o inverso.

- ❌ "Refeição" e "Almoço" com o mesmo peso tipográfico, ou o rótulo maior que o valor.
- ✅ Rótulo pequeno/discreto por cima, valor grande/forte por baixo (padrão etiqueta + conteúdo).
- **Como aplicar:** em qualquer ecrã de confirmação/resumo (onboarding, "pedir receita agora", detalhe de receita), verificar que o olho vai primeiro para o valor, não para o rótulo.

## 13. Indicadores de progresso vêm sempre acompanhados de uma frase motivadora

Um número ou fração sozinha ("0/30", "0 de 29 comprados") não comunica incentivo — soa a métrica técnica desligada do resto do ecrã. Emparelhar sempre com uma frase curta e positiva.

- ❌ "0/30" sozinho.
- ✅ "0/30 · Hoje é um bom dia para começares." / "12 de 29 comprados · Continua assim."
- **Como aplicar:** qualquer contador de progresso novo (streak, lista de compras, checklist) ganha uma frase ao lado — nunca fica só o número.

## 14. Quantidades e unidades como o utilizador realmente compra

Evitar precisão de laboratório em quantidades voltadas ao utilizador (ex. "57 g de alho", "4200 ml de água") — o utilizador pensa em embalagens de loja e medidas caseiras. Arredondar para o tamanho de embalagem real disponível e/ou usar a unidade caseira mais natural quando fizer sentido (ex. "1 cabeça de alho", "2 cebolas médias").

- ❌ "800 ml" quando as lojas só vendem 500 ml/1000 ml/2000 ml.
- ✅ "1000 ml" (arredondado para cima ao tamanho de embalagem disponível mais próximo).
- **Como aplicar:** em qualquer quantidade mostrada na lista de compras ou numa receita, perguntar "é assim que se compra isto numa loja/mercado real?" antes de mostrar o número bruto.

## Checklist antes de publicar copy nova

1. Isto soa a "só serve para X"? (regra 1)
2. É verdade hoje, ou é uma promessa futura? (regra 2)
3. Se menciona saúde, também menciona objetivo/preferências? (regra 3)
4. Se é um rótulo que já existe noutro ecrã, é literalmente igual lá? (regra 5, confirmar com grep)
5. Está em português de Portugal, grafia pré-acordo ortográfico? (regra 9)
6. Um botão de ação segura/reversível soa a destrutivo? (regra 10)
7. Uma pergunta invulgar tem uma frase de "porquê" ao lado? (regra 11)
8. Num par rótulo→valor, o valor tem mais peso visual que o rótulo? (regra 12)
9. Um indicador de progresso vem com uma frase motivadora ao lado? (regra 13)
10. Uma quantidade mostrada ao utilizador é realista para compra/medida caseira? (regra 14)
