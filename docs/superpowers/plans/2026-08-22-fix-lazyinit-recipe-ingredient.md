# Fix LazyInitializationException em GET /admin/recipes/{id} Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar o `org.hibernate.LazyInitializationException: Could not initialize proxy [com.ottimizo.catalog.Ingredient#3] - no session` que rebenta em `GET /api/v1/admin/recipes/{id}` e em `PATCH /api/v1/admin/recipes/{id}/status` (que reusa `RecipeService.get()`).

**Architecture:** `RecipeService.get(Long id)` corre dentro de `@Transactional(readOnly = true)`, mas o mapeamento para `RecipeResponse` (em `AdminRecipeController`) acontece **fora** dessa transacção — a sessão do Hibernate já fechou. Um fix anterior (nesta mesma sessão de debug) já inicializou as colecções `ingredients`/`steps` em si, mas cada elemento de `ingredients` tem a sua própria associação `@ManyToOne(LAZY)` para `Ingredient`, que `RecipeIngredientResponse.from()` acede via `line.ingredient().id()` — isso ainda é um proxy não-inicializado nesse ponto, e por isso a excepção persiste. Este plano fecha essa lacuna: inicializar também o `Ingredient` de cada `RecipeIngredient`, dentro da transacção.

**Tech Stack:** Java 21, Spring Boot 3.5, Hibernate 6.6 (`org.hibernate.Hibernate.initialize`), JUnit 5 + Spring Boot Test (`@SpringBootTest` / repository slice, conforme o que já existir no projecto para `RecipeService`).

**Spec:** Não há spec formal para este bugfix — a evidência é o stack trace real capturado nesta sessão de debug (ver secção "Contexto/Evidência" abaixo). Este plano segue directamente a metodologia `superpowers:systematic-debugging` já aplicada: causa raiz confirmada por captura de stack trace ao vivo, não por suposição.

## Contexto / Evidência (já recolhida, não repetir)

- Fix #1 (já aplicado e compilado, presente em `RecipeService.java:90-91`): `Hibernate.initialize(recipe.ingredients())` + `Hibernate.initialize(recipe.steps())`. Resolveu o `LazyInitializationException` ao nível da colecção, mas **não** resolveu o problema — o mesmo tipo de erro continuou a acontecer.
- Stack trace real capturado depois do fix #1 (consola IntelliJ, backend a correr com perfil `prod` contra Supabase real):
  ```
  org.hibernate.LazyInitializationException: Could not initialize proxy [com.ottimizo.catalog.Ingredient#3] - no session
      at org.hibernate.proxy.AbstractLazyInitializer.initialize(AbstractLazyInitializer.java:174)
      at org.hibernate.proxy.AbstractLazyInitializer.getImplementation(AbstractLazyInitializer.java:328)
      at org.hibernate.proxy.pojo.bytebuddy.ByteBuddyInterceptor.intercept(ByteBuddyInterceptor.java:44)
      at org.hibernate.proxy.ProxyConfiguration$InterceptorDispatcher.intercept(ProxyConfiguration.java:102)
      at com.ottimizo.catalog.Ingredient$HibernateProxy.id(Unknown Source)
      at com.ottimizo.catalog.RecipeIngredientResponse.from(RecipeIngredientResponse.java:14)
      ... (stream/collector frames) ...
      at com.ottimizo.catalog.RecipeResponse.from(RecipeResponse.java:48)
      at com.ottimizo.catalog.AdminRecipeController.get(AdminRecipeController.java:50)
  ```
- Causa raiz confirmada: `RecipeIngredient.ingredient()` é `@ManyToOne(fetch = FetchType.LAZY)` (`RecipeIngredient.java:33`). `RecipeIngredientResponse.from()` (linha 14) chama `line.ingredient().id()`. `Hibernate.initialize(recipe.ingredients())` só materializa a colecção `RecipeIngredient` em si — não segue a associação `ingredient` de cada linha. Como a entidade usa acessor fluente `id()` (não `getId()` convencional de JavaBean), o Hibernate não reconhece o atalho de leitura de identificador sem inicializar o proxy — qualquer acesso a `.id()` força inicialização completa, que falha fora da transacção.
- **Achado critico ao escrever este plano:** o fix #2 (adicionar `recipe.ingredients().forEach(line -> Hibernate.initialize(line.ingredient()));`) foi **dictado ao utilizador por texto nesta conversa mas nunca foi aplicado ao ficheiro** — confirmado por leitura directa de `RecipeService.java:86-93` momentos antes de escrever este plano, que ainda só tem as duas chamadas `Hibernate.initialize` do fix #1. Isto explica por que o mesmo erro (`Ingredient#3`) continuou a aparecer identico depois de "restart/rebuild" — o código nunca mudou. **Não é uma nova causa a investigar — é o fix já diagnosticado, ainda por aplicar.**
- `RecipeStep` (a outra colecção) não tem associações — `RecipeStepResponse.from()` só lê `stepOrder()`/`text()`, scalars simples. Confirmado por leitura directa do ficheiro. Não precisa de nenhum tratamento.
- `updateStatus(Long id, ...)` (`RecipeService.java:151-161`) chama `get(id)` internamente — o mesmo fix cobre os dois endpoints (`GET /{id}` e `PATCH /{id}/status`) sem alterações adicionais.

## Global Constraints

- Backend corre localmente via IntelliJ (perfil `prod`, contra Supabase real `fdbgtfafynvteakamkuf`) — quem aplica o fix e testa é o utilizador humano nesta sessão (Peter), não o agente: edições directas ao ficheiro dentro de `D:\aps\sabor\ottimizo` estão bloqueadas para esta sessão em background (isolamento de worktree para bg jobs). O agente dita o diff exacto; o humano aplica, faz rebuild+restart, e reporta o resultado (stack trace ou sucesso).
- Não introduzir `JOIN FETCH` nem mudar `FetchType` da associação (fora de âmbito — mudaria comportamento de outras queries que usam `RecipeIngredient`/`Ingredient` e não foi pedido). O fix é estritamente inicializar o proxy já lazy, dentro da transacção existente, tal como o fix #1 já fez para as colecções.
- Toda a copy/comentários em português europeu, sem acordo ortográfico de 1990 (norma do projecto) — já seguido nos comentários existentes do ficheiro, manter consistência.

---

## Task 1: Inicializar o proxy `Ingredient` de cada `RecipeIngredient` em `RecipeService.get()`

**Files:**
- Modify: `D:\aps\sabor\ottimizo\src\main\java\com\ottimizo\catalog\RecipeService.java:76-93`
- Test: `D:\aps\sabor\ottimizo\src\test\java\com\ottimizo\catalog\RecipeServiceTest.java` (criar se não existir; ver Step 1 para como confirmar)

**Interfaces:**
- Consumes: `Recipe.ingredients()` → `List<RecipeIngredient>` (já usado pelo fix #1); `RecipeIngredient.ingredient()` → `Ingredient` (proxy lazy, `RecipeIngredient.java:33,64`); `org.hibernate.Hibernate.initialize(Object)` (já importado em `RecipeService.java:10`).
- Produces: `RecipeService.get(Long id)` continua a devolver `Recipe`, mas agora com `ingredients[].ingredient` totalmente inicializado — nenhuma outra classe muda de assinatura.

- [ ] **Step 1: Confirmar se já existe teste para `RecipeService.get()`**

  Correr:
  ```bash
  find D:/aps/sabor/ottimizo/src/test -iname "*RecipeService*"
  ```
  Se não existir nenhum ficheiro, criar `D:\aps\sabor\ottimizo\src\test\java\com\ottimizo\catalog\RecipeServiceTest.java` seguindo o padrão de outro teste de `@DataJpaTest`/`@SpringBootTest` já existente no projecto (ex. procurar `*ServiceTest.java` noutro pacote para copiar a configuração de base — datasource de teste, imports). Se já existir, adicionar o teste do Step 2 a esse ficheiro.

- [ ] **Step 2: Escrever o teste que falha (reproduz o bug fora da transacção)**

  O teste tem de reproduzir exactamente o cenário do bug: chamar `RecipeService.get()`, sair da transacção (o `@Transactional` do próprio método de teste, se houver, fecha a sessão do Hibernate no fim do método — por isso o acesso a `.ingredient().id()` tem de acontecer **depois** do `get()` retornar, tal como acontece em produção no `AdminRecipeController`). Usar `TestEntityManager`/repositório real contra a base de dados de teste do projecto (a mesma usada pelos outros testes de integração — confirmar com o ficheiro copiado no Step 1 qual é).

  ```java
  @Test
  void get_shouldAllowReadingIngredientIdOutsideTransaction() {
      // Arrange: usa uma receita semeada com pelo menos um ingrediente
      // (ajustar o id conforme os dados de teste reais do projecto — ver
      // o ficheiro de seed/fixture que o RecipeServiceTest.java copiado usa).
      Long recipeId = 1L;

      // Act: chama o service (dentro da sua própria transacção, que fecha
      // ao retornar — tal como acontece com o @Transactional(readOnly=true)
      // de RecipeService.get() em produção).
      Recipe recipe = recipeService.get(recipeId);

      // Assert: aceder a ingredient().id() FORA de qualquer transacção activa
      // é exactamente o que AdminRecipeController.get() faz via
      // RecipeResponse.from() -> RecipeIngredientResponse.from(). Antes do
      // fix, isto lança LazyInitializationException.
      assertThat(recipe.ingredients()).isNotEmpty();
      for (RecipeIngredient line : recipe.ingredients()) {
          if (line.ingredient() != null) {
              assertThat(line.ingredient().id()).isNotNull();
          }
      }
  }
  ```

- [ ] **Step 3: Correr o teste e confirmar que falha com `LazyInitializationException`**

  ```bash
  cd D:/aps/sabor/ottimizo && mvn -q -Dtest=RecipeServiceTest#get_shouldAllowReadingIngredientIdOutsideTransaction test
  ```
  Esperado: FALHA com `org.hibernate.LazyInitializationException: Could not initialize proxy [com.ottimizo.catalog.Ingredient#...] - no session` (ou equivalente, dependendo do id de teste usado) — confirma que o teste reproduz o bug real antes de tocar no fix.

  *(Nota para quem executa: se `mvn` local não conseguir resolver dependências por causa de TLS/proxy — problema já visto nesta sessão de debug, não é o teste que está errado — correr o mesmo comando dentro do IntelliJ, que tem o seu próprio toolchain/certificados configurados.)*

- [ ] **Step 4: Aplicar o fix mínimo em `RecipeService.get()`**

  Substituir o método actual (linhas 86-93) por:
  ```java
  @Transactional(readOnly = true)
  public Recipe get(Long id) {
      Recipe recipe = recipes.findById(id)
          .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
      Hibernate.initialize(recipe.ingredients());
      Hibernate.initialize(recipe.steps());
      recipe.ingredients().forEach(line -> Hibernate.initialize(line.ingredient()));
      return recipe;
  }
  ```

  E actualizar o comentário javadoc que já existe acima do método (linhas 76-85) acrescentando, no fim do bloco, esta nota (mantém o resto do texto existente tal como está):
  ```java
      * Cada {@code RecipeIngredient.ingredient()} e' tambem {@code
      * FetchType.LAZY} (@ManyToOne) — inicializar so a colecao nao chega,
      * {@code RecipeIngredientResponse.from()} acede a {@code
      * ingredient().id()} fora da transaccao e rebenta com o mesmo erro (o
      * acessor fluente {@code id()}, ao contrario do {@code getId()}
      * convencional do JavaBean, nao e' reconhecido pelo atalho do proxy do
      * Hibernate para ler o identificador sem inicializar).
  ```

- [ ] **Step 5: Correr o teste e confirmar que passa**

  ```bash
  cd D:/aps/sabor/ottimizo && mvn -q -Dtest=RecipeServiceTest#get_shouldAllowReadingIngredientIdOutsideTransaction test
  ```
  Esperado: PASS.

- [ ] **Step 6: Rebuild + restart do backend (IntelliJ) e validação manual ponta-a-ponta**

  No IntelliJ: Build > Rebuild Project (não hot-swap — a assinatura do método não mudou mas o corpo sim, e hot-swap de corpo de método normalmente funciona, mas rebuild completo elimina qualquer dúvida) e reiniciar a run configuration `OttimizoApplication` (perfil `prod`).

  Depois, usando a colecção Postman já criada (`D:\aps\sabor\postman\Ottimizo.postman_collection.json`):
  1. Correr **Auth (Supabase) → Login** (com `test_password` preenchido).
  2. Correr **Admin / Receitas → Obter receita por id** (`recipe_id = 1`).
  3. Esperado: `200 OK` com o corpo `RecipeResponse`, incluindo `ingredients[].ingredientId` preenchido (não erro `LSA099_INTERNAL`).
  4. Correr **Admin / Receitas → Publicar / despublicar receita** (`PATCH .../status`, que reusa `get()` internamente).
  5. Esperado: `200 OK`.

- [ ] **Step 7: Commit**

  ```bash
  cd D:/aps/sabor/ottimizo
  git add src/main/java/com/ottimizo/catalog/RecipeService.java src/test/java/com/ottimizo/catalog/RecipeServiceTest.java
  git commit -m "fix(ottimizo): inicializa proxy Ingredient de cada RecipeIngredient em RecipeService.get()

Resolve LazyInitializationException em GET /admin/recipes/{id} e PATCH
/admin/recipes/{id}/status — a colecao ingredients ja estava inicializada
mas cada RecipeIngredient.ingredient() e' uma associacao @ManyToOne(LAZY)
separada, acedida fora da transaccao por RecipeIngredientResponse.from()."
  ```

## Self-Review (feito ao escrever este plano)

1. **Cobertura:** único requisito é "corrigir o `LazyInitializationException` em `Ingredient#3`" — Task 1 cobre isso directamente, com evidência de stack trace real, não suposição.
2. **Placeholders:** nenhum "TBD"/"implementar depois" — o diff exacto está no Step 4, o teste exacto está no Step 2 (o único ponto em aberto é o `recipeId`/dados de fixture exactos a usar no teste, que depende de qual ficheiro de teste já existe no projecto — resolvido explicitamente no Step 1 como primeira acção, não deixado como placeholder solto).
3. **Consistência de tipos:** `Recipe.ingredients()` → `List<RecipeIngredient>`, `RecipeIngredient.ingredient()` → `Ingredient` — confirmados por leitura directa do código nesta sessão, coincidem com o que `RecipeIngredientResponse.from()` já usa.
