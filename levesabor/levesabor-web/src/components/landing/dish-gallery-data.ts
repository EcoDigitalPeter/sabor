// FE-P04 · dish-gallery-data — 8 pratos moçambicanos da galeria da landing v2. Valores de
// kcal/macros são ilustrativos, por porção — mesmo padrão do resto da landing.
import type { Macros } from "@/components/macro-ring/MacroRing";

export type DishGalleryItem = {
  slug: string;
  name: string;
  sensory: string;
  kcal: number;
  minutes: number;
  tag: string;
  macros: Macros;
  note: string;
  /** Caminho em /public — opcional; sem foto, o cartão cai no placeholder em CSS/ícone. */
  image?: string;
};

export const DISH_GALLERY: DishGalleryItem[] = [
  {
    slug: "matapa-de-amendoim",
    name: "Matapa de amendoim",
    sensory: "Folhas de mandioca cozinhadas devagar em amendoim torrado e leite de coco.",
    kcal: 480,
    minutes: 35,
    tag: "clássico",
    macros: { proteina: 18, carbs: 40, gordura: 32, fibra: 10 },
    note: "Rico em fibra — ótimo com xima ou arroz.",
    image: "/images/pratos/matapa-de-amendoim.webp",
  },
  {
    slug: "caril-de-amendoim-com-frango",
    name: "Caril de amendoim com frango",
    sensory: "Frango estufado em molho cremoso de amendoim, alho e um toque de piri-piri.",
    kcal: 610,
    minutes: 45,
    tag: "proteína alta",
    macros: { proteina: 34, carbs: 30, gordura: 28, fibra: 8 },
    note: "Boa fonte de proteína para o almoço.",
    image: "/images/pratos/caril-de-amendoim-com-frango.webp",
  },
  {
    slug: "frango-a-zambeziana",
    name: "Frango à zambeziana",
    sensory: "Frango grelhado com marinada de coco e piri-piri, até estalar por fora.",
    kcal: 540,
    minutes: 40,
    tag: "picante",
    macros: { proteina: 36, carbs: 22, gordura: 26, fibra: 6 },
    note: "Ajusta o piri-piri ao teu gosto.",
    image: "/images/pratos/frango-a-zambeziana.webp",
  },
  {
    slug: "badjias-de-feijao-nhemba",
    name: "Badjias de feijão nhemba",
    sensory: "Bolinhos fritos de feijão nhemba moído, crocantes por fora, macios por dentro.",
    kcal: 320,
    minutes: 30,
    tag: "lanche",
    macros: { proteina: 14, carbs: 38, gordura: 12, fibra: 9 },
    note: "Ótimo lanche da tarde ou entrada.",
    image: "/images/pratos/badjias-de-feijao-nhemba.webp",
  },
  {
    slug: "xima-com-peixe-grelhado",
    name: "Xima com peixe grelhado",
    sensory: "Xima de milho branca com peixe grelhado e um toque de limão e coentros.",
    kcal: 560,
    minutes: 30,
    tag: "leve",
    macros: { proteina: 30, carbs: 46, gordura: 14, fibra: 5 },
    note: "Refeição leve e completa.",
    image: "/images/pratos/xima-com-peixe-grelhado.webp",
  },
  {
    slug: "feijao-nhemba-com-arroz",
    name: "Feijão nhemba com arroz",
    sensory: "Feijão nhemba estufado com cebola e tomate, servido sobre arroz solto.",
    kcal: 500,
    minutes: 40,
    tag: "económico",
    macros: { proteina: 20, carbs: 58, gordura: 10, fibra: 14 },
    note: "Fibra alta, custo baixo.",
    image: "/images/pratos/feijao-nhemba-com-arroz.webp",
  },
  {
    slug: "mucapata",
    name: "Mucapata",
    sensory: "Papas de arroz e feijão nhemba com leite de coco — conforto num prato só.",
    kcal: 430,
    minutes: 50,
    tag: "conforto",
    macros: { proteina: 16, carbs: 52, gordura: 16, fibra: 10 },
    note: "Tradicional do pequeno-almoço ao jantar.",
    image: "/images/pratos/mucapata.webp",
  },
  {
    slug: "couve-refogada-com-amendoim",
    name: "Couve refogada com amendoim",
    sensory: "Couve picada finamente, refogada com amendoim torrado e um fio de óleo.",
    kcal: 260,
    minutes: 20,
    tag: "acompanhamento",
    macros: { proteina: 10, carbs: 24, gordura: 14, fibra: 12 },
    note: "Acompanhamento vitaminado para qualquer prato.",
    image: "/images/pratos/couve-refogada-com-amendoim.webp",
  },
];
