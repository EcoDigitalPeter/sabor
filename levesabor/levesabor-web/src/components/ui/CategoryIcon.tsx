// FE-B10 (escopo reduzido) · CategoryIcon — ícones de linha das 6 categorias da lista de compras (P-06, docs/plano/02-ui-ux-plan.md §4)
// Placeholder desenhado à mão em SVG inline (sem geração de imagem por IA) — grelha 24×24, área de desenho ~20×20,
// stroke único que herda `currentColor` (a app recolore por CSS, ex. clay/terracotta conforme o contexto).

export type ShoppingCategory =
  | "CEREAIS_E_FARINHAS"
  | "PROTEINA"
  | "VEGETAIS_E_FOLHAS"
  | "LEGUMINOSAS"
  | "TEMPEROS_E_OLEOS"
  | "OUTROS";

export type CategoryIconProps = {
  category: ShoppingCategory;
  size?: number;
};

/** Espiga de milho — traço central com "barbas" em pares e ponta arredondada. */
function CereaisEFarinhasIcon() {
  return (
    <>
      <path d="M12 20V5" />
      <path d="M12 16L8.5 13" />
      <path d="M12 16L15.5 13" />
      <path d="M12 12L8.5 9" />
      <path d="M12 12L15.5 9" />
      <path d="M12 8L9.5 5.5" />
      <path d="M12 8L14.5 5.5" />
      <circle cx="12" cy="4" r="1.1" />
    </>
  );
}

/** Peixe simples — corpo oval, cauda triangular, olho e guelra. */
function ProteinaIcon() {
  return (
    <>
      <ellipse cx="10" cy="12" rx="7" ry="4.2" />
      <path d="M17 12L21.5 8.5V15.5Z" />
      <circle cx="6.2" cy="11.2" r="0.9" fill="currentColor" stroke="none" />
      <path d="M9 12c1.2.6 2.4.6 3.6 0" />
    </>
  );
}

/** Folha de couve — silhueta em gota com nervura central. */
function VegetaisEFolhasIcon() {
  return (
    <>
      <path d="M12 21c-5-2-8-6.5-8-11.5C4 6 7 3 12 3s8 3 8 6.5C20 14.5 17 19 12 21z" />
      <path d="M12 20V4" />
    </>
  );
}

/** Vagem (feijão nhemba) com 3 grãos. */
function LeguminosasIcon() {
  return (
    <>
      <path d="M4 16C6 8 12 4 20 6C18 14 12 18 4 16Z" />
      <circle cx="8.5" cy="13.5" r="1" />
      <circle cx="12" cy="11.5" r="1" />
      <circle cx="15.5" cy="9.5" r="1" />
    </>
  );
}

/** Pilão (mortar-and-pestle) — tigela em arco, rebordo e mão do pilão. */
function TemperosEOleosIcon() {
  return (
    <>
      <path d="M4 11a8 6 0 0 0 16 0" />
      <path d="M3 11h18" />
      <path d="M9 13.5L15 4" />
      <circle cx="16" cy="3.2" r="1.6" />
    </>
  );
}

/** Cesto pequeno — corpo trapezoidal, asa e duas linhas de trança. */
function OutrosIcon() {
  return (
    <>
      <path d="M5 10L19 10L17.5 20L6.5 20Z" />
      <path d="M8 10c0-3 1.8-5 4-5s4 2 4 5" />
      <path d="M9.5 12.5v6" />
      <path d="M14.5 12.5v6" />
    </>
  );
}

const CATEGORY_ICONS: Record<ShoppingCategory, () => JSX.Element> = {
  CEREAIS_E_FARINHAS: CereaisEFarinhasIcon,
  PROTEINA: ProteinaIcon,
  VEGETAIS_E_FOLHAS: VegetaisEFolhasIcon,
  LEGUMINOSAS: LeguminosasIcon,
  TEMPEROS_E_OLEOS: TemperosEOleosIcon,
  OUTROS: OutrosIcon,
};

export function CategoryIcon({ category, size = 24 }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <Icon />
    </svg>
  );
}
