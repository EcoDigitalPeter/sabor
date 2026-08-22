# Plano de testes — validação do feedback do cliente

> Objectivo: validar, de forma rastreável, se a implementação frontend respondeu à ronda de feedback em `feedback/feedback.txt`.
>
> Âmbito actual: frontend contra MSW mocks. Backend real, persistência real, geocodificação, pagamento/entrega e parsing Excel real ficam fora deste plano até `INT-*`.

## 1. Estratégia

### Tipos de validação

| Tipo | Quando usar | Evidência |
|---|---|---|
| Playwright E2E | Fluxos navegáveis, formulários, estados, navegação e regressões | `npx playwright test ... --workers=1` verde |
| Inspecção visual/manual | Hierarquia, clareza de copy, checkmarks, imagens, destaque visual, responsividade | captura desktop/mobile + checklist assinado |
| Grep/estático | Copy exacta, ausência de termos antigos, vocabulário fechado | comandos `rg` sem ocorrências indevidas |
| Contrato/mock | Campos novos aceites por mocks e tipos | `typecheck`, fixtures e handlers coerentes |

### Modo de execução recomendado

Os testes E2E devem correr serializados porque a sessão e os mocks vivem em memória:

```powershell
cd D:\aps\sabor\levesabor\levesabor-web
$env:PLAYWRIGHT_PORT='3122'
npx playwright test e2e/landing.spec.ts e2e/customer-landing-dashboard.spec.ts e2e/registo-onboarding.spec.ts e2e/portal.spec.ts e2e/plano-mensal.spec.ts e2e/pedir-agora.spec.ts e2e/lista-compras-interacoes.spec.ts e2e/receitas.spec.ts e2e/encomendas-cancelar.spec.ts --project=chromium --workers=1
npm run typecheck
npm run lint
```

## 2. Matriz de cobertura por feedback

| ID | Feedback a validar | Critério de aceitação | Cobertura actual | Lacuna / acção |
|---|---|---|---|---|
| FB-01 | Landing: remover “cartão de crédito”, trocar “preferências” por “preferências alimentares”, “receitas reais” por “refeições reais” | A landing não mostra as expressões antigas e todos os CTAs continuam a apontar para registo | `e2e/landing.spec.ts` cobre CTAs/secções; falta grep explícito de copy | Adicionar teste/grep CI: `rg "cartão de crédito|tuas preferências\\b|receitas reais"` |
| FB-02 | Português de Portugal sem Acordo Ortográfico | Copy nova usa `objectivo`, `acção`, `recepção`, etc.; não reintroduz variantes brasileiras | Parcial por revisão manual | Checklist manual obrigatório por ecrã + grep para termos críticos |
| FB-03 | Registo: “Nome completo” | Campo de registo usa label “Nome completo” | `registo-onboarding.spec.ts`, `customer-landing-dashboard.spec.ts` | Coberto |
| FB-04 | Aviso médico movido para o resumo do onboarding | Registo não pede consentimento; resumo mostra “Aviso” e checkbox obrigatória antes de gerar plano | `registo-onboarding.spec.ts`, `customer-landing-dashboard.spec.ts` | Coberto; acrescentar asserção negativa no registo se quisermos blindar regressão |
| FB-05 | Onboarding objectivo: nova imagem | Primeiro passo mostra ilustração adequada e não quebra layout mobile | Parcial visual | Teste manual com screenshot desktop/mobile |
| FB-06 | Botão Continuar desabilitado até escolher objectivo | No passo objectivo, “Continuar” começa disabled e activa após selecção | `registo-onboarding.spec.ts` | Coberto |
| FB-07 | Labels: “Ganhar massa muscular”, “Controlar uma condição de saúde” | Labels aparecem iguais em onboarding, perfil, pedir receita e landing/quiz | Parcial por specs | Grep estático para labels antigos e novos |
| FB-08 | Condição de saúde: visto no cartão seleccionado | Cartão seleccionado tem indicação visual clara | Parcial visual | Screenshot/manual; opcional: asserção `aria-pressed=true` no E2E |
| FB-09 | Condição de saúde: “Outra”, texto livre, selecção múltipla | Permite múltiplas condições; “Outra” abre campo obrigatório | Falta E2E dedicado | Criar teste de onboarding com `Diabetes tipo 2` + `Hipertensão` + `Outra` |
| FB-10 | Alergias separadas de alimentos que não comes | Existem grupos separados e resumo preserva ambos | `registo-onboarding.spec.ts` cobre passagem; falta preenchimento dos dois grupos | Estender teste para adicionar uma alergia e uma exclusão |
| FB-11 | Preferências: “Vegana”, “Baixo em calorias”, “Sem preferência” | Opções aparecem e `sem_preferencia` é aceite pelo mock | `customer-landing-dashboard.spec.ts` cobre “Sem preferência” | Coberto após correcção do mock; adicionar grep para “Vegan”/“Baixo teor calórico” |
| FB-12 | Orçamento: Económico/Equilibrado/Premium + faixas MT | As três opções e intervalos aparecem | `registo-onboarding.spec.ts` cobre “Equilibrado”; faltam as outras | Adicionar teste estático/visual para todas as opções |
| FB-13 | Refeições por dia: pergunta e frase contextual novas | Copy exacta aparece no passo | `registo-onboarding.spec.ts` verifica heading | Coberto parcialmente; acrescentar asserção da frase de apoio |
| FB-14 | Pessoas em casa: frase com “automaticamente” | Copy exacta aparece e stepper funciona | `registo-onboarding.spec.ts` verifica heading | Acrescentar asserção da frase e stepper +/- |
| FB-15 | Resumo do onboarding com botões “Editar” por secção | Cada secção editável volta ao passo correcto e preserva dados | Parcial por presença no código | Criar teste específico de editar objectivo/preferência a partir do resumo |
| FB-16 | Final onboarding: texto mais entusiasmante e CTA “Ver o meu plano” | Mostra “O teu perfil está pronto...” e botão “Ver o meu plano” | `registo-onboarding.spec.ts`, `customer-landing-dashboard.spec.ts` | Coberto |
| FB-17 | Loading de geração com frases rotativas | `/plano/gerar` mostra frases de preparação antes do plano | Parcial por fluxo chegar ao plano | Acrescentar asserção de pelo menos uma frase em `registo-onboarding.spec.ts` |
| FB-18 | Plano: CTA “Pedir uma receita” e microcopy menos banal | CTA visível e fluxo abre `/plano/pedir-agora` | `portal.spec.ts`, `pedir-agora.spec.ts` | Coberto |
| FB-19 | Streak/progresso: mensagem positiva junto do 0/30 | Texto motivacional aparece junto do anel | `plano-mensal.spec.ts` cobre mês/semanas; falta texto | Acrescentar asserção “Hoje é um bom dia...” |
| FB-20 | Nomes de refeições sem parênteses + etiqueta separada | Cartões mostram nome limpo e tag separada | Parcial no fluxo do plano | Acrescentar asserção para “Xima com feijão nhemba” e ausência de “(pequeno-almoço reforçado)” |
| FB-21 | MealCard mostra kcal, proteína e tempo | Cartão mostra padrão `kcal • g proteína • min` | `portal.spec.ts` indirectamente; `plano-mensal.spec.ts` indirectamente | Criar asserção explícita no primeiro MealCard |
| FB-22 | Destacar refeição actual | Refeição correspondente à hora tem destaque visual | Manual/visual | Teste visual com hora mockada ou manual em manhã/tarde/noite |
| FB-23 | Total do dia com indicador “Dentro do objectivo” | Resumo diário mostra kcal e estado | `plano-mensal.spec.ts` pode ser estendido | Acrescentar asserção exacta |
| FB-24 | “Gerar novo plano” renomeado para acção menos assustadora | Botão mostra “Criar outro plano” ou equivalente | Parcial por contexto Playwright | Grep para “Gerar novo plano”; asserção no plano |
| FB-25 | Check “Comi isto” só depois de marcar | Estado inicial não parece concluído; toggle altera estado | `plano-mensal.spec.ts` | Coberto |
| FB-26 | Swipe direita/esquerda para comi/trocar | Ideia futura, não implementada | Sem cobertura | Registar como fora do âmbito/UAT futuro |
| FB-27 | Pedir receita agora: contexto por passo e selecção preenchida | Cada passo explica o motivo e selected state é evidente | `pedir-agora.spec.ts` cobre fluxo; visual parcial | Acrescentar screenshots/manual |
| FB-28 | Pedir receita agora: perguntas/copy novas | Headings e placeholders seguem feedback | Parcial | Adicionar asserções de copy para os 4 passos |
| FB-29 | Confirmação do pedido: valores destacados, mensagem de expectativa e Editar | Resumo mostra valores com hierarquia e permite editar | Parcial | Criar teste E2E de editar refeição/objectivo a partir do resumo |
| FB-30 | Resultado avulso: unidade `kcal` no gráfico e CTA visível | Resultado mostra `kcal` e CTAs de guardar/gerar outra | `pedir-agora.spec.ts` parcial | Acrescentar asserções de `kcal` e nomes dos botões |
| FB-31 | “Descartar” renomeado | A palavra “Descartar” não aparece no resultado | Parcial | Grep/teste: `rg "Descartar"` deve não encontrar copy activa |
| FB-32 | Guardar/substituir receita: mostra dia/refeição/data e confirma substituição | Bottom sheet destaca alvo e abre confirmação se já há refeição | `pedir-agora.spec.ts` cobre fluxo; verificar detalhes | Estender asserções para data completa e texto do diálogo |
| FB-33 | Dashboard Início: cartões Refeições, Receitas, Compras, Encomendas | `/inicio` mostra blocos pedidos | `customer-landing-dashboard.spec.ts` | Coberto |
| FB-34 | Receitas no início: copy orientada a benefício | Texto deve vender descoberta adaptada ao perfil | Parcial | Asserção exacta no dashboard; hoje confirmar se copy final está alinhada |
| FB-35 | Compras: resumo antes dos botões | Mostra produtos, estimativa, comprados/progresso antes das acções | `lista-compras-interacoes.spec.ts` provável; validar explícito | Acrescentar asserção de ordem visual/manual |
| FB-36 | Botão “Encomendar rancho” renomeado ou mantido por decisão | Decidir texto final: cliente sugeriu “Encomendar compras/Comprar online” | Actualmente pode ainda usar “Encomendar rancho” | Marcar decisão de produto; se alterar, ajustar E2E |
| FB-37 | “Adicionar item” -> “Adicionar ingrediente” ou ícone + texto | Acção clara e consistente | `lista-compras-interacoes.spec.ts` cobre adicionar item; validar copy | Decidir se “item” é aceitável ou mudar |
| FB-38 | “Tenho em casa” como selector/stepper | Permite reduzir quantidade com `[-]/[+]` e recalcula | `lista-compras-interacoes.spec.ts` | Coberto se spec valida quantidade/custo; rever asserções |
| FB-39 | Impacto de custo antes/depois | Resumo mostra alteração de estimativa ao indicar stock em casa | `lista-compras-interacoes.spec.ts` parcial | Asserção explícita de valor antes/depois |
| FB-40 | Barra/percentagem de progresso | Lista mostra barra e percentagem | `lista-compras-interacoes.spec.ts` parcial | Asserção de percentagem e alteração ao marcar comprado |
| FB-41 | Quantidades arredondadas para embalagens reais | Mock arredonda g/ml para tamanhos configurados | Parcial por fixture | Teste unitário/integração leve sobre `buildShoppingList` ou E2E com valores esperados |
| FB-42 | Adicionar produtos fora do plano | Cliente consegue adicionar item manual | `lista-compras-interacoes.spec.ts` | Coberto |
| FB-43 | Unidades naturais: alho/cebola/banana/água | Ideia parcialmente fora do âmbito; exige tabela por ingrediente | Sem cobertura | Registar como backlog/futuro, não bloquear feedback fechado |
| FB-44 | Feijão cozido vs seco | Questão funcional de catálogo/conteúdo | Sem cobertura | Validar com cliente/nutricionista; teste de dados quando houver catálogo final |
| FB-45 | Loja: cartão com rating, entrega, horário, preço | Escolha de loja mostra informação útil | `plano-mensal.spec.ts` cobre encomenda; falta campos | Acrescentar asserções em fluxo `/compras/encomendar` |
| FB-46 | Loja: pesquisa quando há muitas lojas | Input de pesquisa aparece com >4 lojas e filtra por nome | Deve ser coberto por novo teste | Acrescentar teste E2E específico |
| FB-47 | Loja: mini-mapa de lojas | Mapa aproximado renderiza com pins de lojas | Parcial visual | Teste DOM/SVG + screenshot manual |
| FB-48 | Ordenação de lojas por proximidade | Frontend deve respeitar a ordem recebida do backend/mock; não calcula distância | Parcial por revisão | Teste de contrato mock: ordem de `/stores` é a ordem renderizada; sem `distanceKm`/sort local |

## 3. Suites Playwright propostas

### 3.1 Smoke completo de jornada

Executar:

```powershell
npx playwright test e2e/customer-landing-dashboard.spec.ts --project=chromium --workers=1
```

Valida:
- landing abre;
- CTA leva ao registo;
- conta nova é criada;
- onboarding completo aceita `Sem preferência`;
- geração leva ao plano;
- navegação chega ao dashboard `/inicio`.

### 3.2 Feedback da landing e copy pública

Executar:

```powershell
npx playwright test e2e/landing.spec.ts --project=chromium --workers=1
rg -n "cartão de crédito|tuas preferências\b|receitas reais|Vegan|Baixo teor calórico|Gerir uma condição" src docs feedback
```

Resultado esperado:
- Playwright verde;
- grep sem ocorrências em código/copy activa, excepto no próprio `feedback/feedback.txt` ou documentação histórica.

### 3.3 Onboarding/registo

Executar:

```powershell
npx playwright test e2e/registo-onboarding.spec.ts e2e/customer-landing-dashboard.spec.ts --project=chromium --workers=1
```

Casos adicionais a adicionar:
- `Outra` em saúde abre campo e exige texto;
- múltiplas condições podem ficar seleccionadas;
- botão `Editar` no resumo volta ao passo certo;
- alergia e alimento excluído aparecem separados no resumo;
- frases de loading aparecem em `/plano/gerar`.

### 3.4 Plano, início e detalhe de receita

Executar:

```powershell
npx playwright test e2e/portal.spec.ts e2e/plano-mensal.spec.ts e2e/troca-refeicao.spec.ts --project=chromium --workers=1
```

Casos adicionais a adicionar:
- texto motivacional junto do progresso mensal;
- ausência de nomes com parênteses nos MealCards;
- `kcal • g proteína • min` no cartão;
- “Criar outro plano” em vez de copy destrutiva;
- indicador “Dentro do objectivo”.

### 3.5 Pedir receita agora

Executar:

```powershell
npx playwright test e2e/pedir-agora.spec.ts --project=chromium --workers=1
```

Casos adicionais a adicionar:
- copy exacta dos 4 passos;
- resumo com valores mais fortes que labels;
- mensagem de expectativa antes de gerar;
- `kcal` visível no resultado;
- ausência de “Descartar”;
- diálogo de substituição mostra receita antiga e nova.

### 3.6 Lista de compras

Executar:

```powershell
npx playwright test e2e/lista-compras-interacoes.spec.ts --project=chromium --workers=1
```

Casos adicionais a adicionar:
- resumo antes dos botões;
- progresso em barra/percentagem;
- `Tenho em casa` recalcula quantidade e custo;
- item comprado fica visualmente esbatido;
- categoria fica colapsada quando 100% comprada;
- item manual aparece como ingrediente adicional.

### 3.7 Escolha de loja e encomendas

Executar:

```powershell
npx playwright test e2e/plano-mensal.spec.ts e2e/encomendas-cancelar.spec.ts --project=chromium --workers=1
```

Casos adicionais a adicionar:
- cartões de loja mostram rating, entrega, horário e preço;
- pesquisa de loja filtra quando há muitas lojas;
- mini-mapa renderiza SVG com pins;
- ordem visual das lojas é igual à ordem devolvida por `/stores`, sem cálculo local de distância.

## 4. Checklist manual de UAT

### Desktop e mobile

Validar em 390x844 e 1366x768:

- landing sem overflow horizontal;
- onboarding com imagem e checkmarks visíveis;
- botões não cortam texto;
- valores no resumo têm mais destaque do que labels;
- dashboard mostra progressos sem parecer vazio;
- cartões de refeição não ficam pesados com nomes longos;
- lista de compras continua fácil de usar com categorias colapsadas;
- escolha de loja mostra mapa e cartões sem ruído.

### Copy e tom

Verificar:

- Português europeu sem Acordo Ortográfico;
- acções reversíveis não soam destrutivas;
- contexto antes de perguntas sensíveis;
- frases motivacionais junto de progresso;
- nenhuma promessa de pagamento/entrega gerida pela plataforma.

## 5. Critério de fecho

Considerar a ronda `feedback/feedback.txt` fechada quando:

1. todos os testes E2E acima passam com `--workers=1`;
2. `npm run typecheck` e `npm run lint` passam;
3. greps de copy antiga não encontram ocorrências em UI activa;
4. checklist manual desktop/mobile está assinado;
5. pontos explicitamente futuros (`swipe`, unidades naturais por ingrediente, feijão seco/cozido, geocodificação/backend real) estão documentados como backlog e não como falha de entrega.
