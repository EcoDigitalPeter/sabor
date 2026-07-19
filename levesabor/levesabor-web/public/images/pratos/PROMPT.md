# P-09 — Galeria de pratos da landing v2 (secção "Pratos que já conheces")

**Onde é usada:** `DishGallery.tsx` (`src/components/landing/DishGallery.tsx`), um cartão por prato — hoje mostra um círculo em gradiente da marca + ícone Lucide como placeholder; ao gerar as fotos, substituir por `next/image` com `width={112} height={112}`.
**Ficheiros esperados nesta pasta:** 8 PNG, 600×600, fundo transparente ou removível, cada um <60 KB, com o nome exato do `slug` em `src/components/landing/dish-gallery-data.ts`:

- `matapa-de-amendoim.png`
- `caril-de-amendoim-com-frango.png`
- `frango-a-zambeziana.png`
- `badjias-de-feijao-nhemba.png`
- `xima-com-peixe-grelhado.png`
- `feijao-nhemba-com-arroz.png`
- `mucapata.png`
- `couve-refogada-com-amendoim.png`

Gera as 8 na mesma sessão/lote para manter luz, ângulo e estilo consistentes entre cartões.

## Prompt-base para colar no ChatGPT (repete para cada prato, trocando só a descrição)

> Cria uma fotografia realista, vista de cima ou a 45°, de um prato de comida moçambicana: **{descrição do prato}**. Iluminação natural suave, cores quentes, prato de cerâmica simples sobre superfície neutra (madeira clara ou tecido de algodão cru) — o mesmo estilo de fotografia em todas as imagens desta série, para ficarem visualmente consistentes lado a lado numa grelha.
>
> Formato quadrado 1:1, 600×600 px, fundo simples e claro, facilmente recortável.
>
> NÃO incluir: texto, logótipos, mãos, talheres a segurar o prato, marcas de água.

## Descrições por prato (usar a coluna `sensory` de `dish-gallery-data.ts` como base)

1. **Matapa de amendoim** — folhas de mandioca cozinhadas devagar em amendoim torrado e leite de coco.
2. **Caril de amendoim com frango** — frango estufado em molho cremoso de amendoim, alho e um toque de piri-piri.
3. **Frango à zambeziana** — frango grelhado com marinada de coco e piri-piri, pele estaladiça.
4. **Badjias de feijão nhemba** — bolinhos fritos de feijão nhemba moído, crocantes por fora.
5. **Xima com peixe grelhado** — xima de milho branca com peixe grelhado, limão e coentros.
6. **Feijão nhemba com arroz** — feijão nhemba estufado com cebola e tomate, sobre arroz solto.
7. **Mucapata** — papas de arroz e feijão nhemba com leite de coco, num tom cremoso.
8. **Couve refogada com amendoim** — couve picada finamente, refogada com amendoim torrado.
