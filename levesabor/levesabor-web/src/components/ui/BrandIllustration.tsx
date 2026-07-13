// FE-B10 (escopo reduzido) · BrandIllustration — placeholders de marca para as 5 ilustrações P-01..P-05
// (docs/plano/02-ui-ux-plan.md §4 "Prompts para geração de imagens"). Imagens reais geradas por IA (ChatGPT)
// ficam para uma sessão seguinte — isto é um SVG inline leve, on-brand, para os ecrãs não ficarem em branco.
// Formas planas/orgânicas, paleta restrita por variante, sem texto/pessoas/fotorrealismo (conforme o plano).

export type BrandIllustrationVariant =
  | "onboarding" // P-01 — topo do wizard de onboarding
  | "empty-plan" // P-02 — dashboard sem plano ainda gerado
  | "generating" // P-03 — ecrã de geração do plano por IA
  | "empty-shopping" // P-04 — lista de compras vazia
  | "onboarding-success"; // P-05 — passo final do onboarding

export type BrandIllustrationProps = {
  variant: BrandIllustrationVariant;
  size?: number;
};

/** P-01 — prato moçambicano estilizado visto de cima, rodeado por símbolos de objetivo em círculo. */
function OnboardingIllustration() {
  return (
    <>
      <circle cx="100" cy="100" r="58" fill="var(--tan)" />
      <ellipse cx="100" cy="104" rx="34" ry="24" fill="#FFFFFF" />
      <ellipse cx="80" cy="94" rx="15" ry="10" fill="var(--terracotta)" transform="rotate(-15 80 94)" />
      {/* seta suave */}
      <g transform="translate(100,16)">
        <path d="M0 -9L7 6Q0 2 -7 6Z" fill="var(--amber)" />
      </g>
      {/* folha */}
      <g transform="translate(27,142) rotate(-20)">
        <path d="M0 -8c5 2 5 10 0 14c-5-4-5-12 0-14z" fill="var(--forest)" />
      </g>
      {/* coração */}
      <g transform="translate(173,142)">
        <path d="M0 6C-6 0 -6 -6 0 -3C6 -6 6 0 0 6Z" fill="var(--terracotta)" />
      </g>
    </>
  );
}

/** P-02 — prato vazio com talheres, formas tracejadas "por chegar" e um brilho discreto. */
function EmptyPlanIllustration() {
  return (
    <>
      <circle cx="100" cy="125" r="52" fill="none" stroke="var(--clay)" strokeWidth={5} />
      {/* garfo */}
      <g stroke="var(--clay)" strokeWidth={4} strokeLinecap="round">
        <path d="M34 95v18" />
        <path d="M40 95v55" />
        <path d="M46 95v18" />
      </g>
      {/* faca */}
      <g stroke="var(--clay)" strokeWidth={4} strokeLinecap="round">
        <path d="M160 95c6 2 9 8 6 16" />
        <path d="M160 95v55" />
      </g>
      {/* silhuetas tracejadas a pairar */}
      <ellipse cx="80" cy="55" rx="10" ry="7" fill="none" stroke="var(--amber)" strokeWidth={3} strokeDasharray="4 5" />
      <ellipse cx="105" cy="38" rx="8" ry="6" fill="none" stroke="var(--terracotta)" strokeWidth={3} strokeDasharray="4 5" />
      <ellipse cx="126" cy="58" rx="9" ry="6" fill="none" stroke="var(--amber)" strokeWidth={3} strokeDasharray="4 5" />
      {/* brilho */}
      <path d="M142 26v14M135 33h14" stroke="var(--terracotta)" strokeWidth={3} strokeLinecap="round" />
    </>
  );
}

/** P-03 — anel segmentado incompleto nas 4 cores dos macros, com pequenos "ingredientes" a orbitar. */
function GeneratingIllustration() {
  const r = 75;
  const circumference = 2 * Math.PI * r;
  const segment = 95;
  const gap = (circumference - segment * 4) / 4;
  const dash = `${segment} ${circumference - segment}`;
  return (
    <>
      <g transform="rotate(-90 100 100)">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--macro-proteina)" strokeWidth={14} strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={0} />
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--macro-carbs)" strokeWidth={14} strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={-(segment + gap)} />
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--macro-gordura)" strokeWidth={14} strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={-2 * (segment + gap)} />
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--macro-fibra)" strokeWidth={14} strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={-3 * (segment + gap)} />
      </g>
      <circle cx="100" cy="6" r="6" fill="var(--tan)" />
      <circle cx="100" cy="194" r="6" fill="var(--tan)" />
    </>
  );
}

/** P-04 — cesto de compras (palha trançada) vazio, com etiqueta em branco ao lado. */
function EmptyShoppingIllustration() {
  return (
    <>
      <path d="M55 100L145 100L130 160L70 160Z" fill="var(--tan)" stroke="var(--clay)" strokeWidth={3} strokeLinejoin="round" />
      <path d="M75 100c0-22 11-38 25-38s25 16 25 38" fill="none" stroke="var(--clay)" strokeWidth={4} strokeLinecap="round" />
      <path d="M85 108v45" stroke="var(--clay)" strokeWidth={2} strokeLinecap="round" />
      <path d="M115 108v45" stroke="var(--clay)" strokeWidth={2} strokeLinecap="round" />
      <rect x="155" y="95" width="28" height="38" rx="4" fill="#FFFFFF" stroke="var(--clay)" strokeWidth={2} />
      <circle cx="169" cy="102" r="2.5" fill="var(--terracotta)" />
    </>
  );
}

/** P-05 — anel de marca completo (4 segmentos) com um visto orgânico em forest ao centro. */
function OnboardingSuccessIllustration() {
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const gap = 6;
  const segment = circumference / 4 - gap;
  const dash = `${segment} ${circumference - segment}`;
  return (
    <>
      <g transform="rotate(-90 100 100)">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--macro-proteina)" strokeWidth={14} strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={0} />
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--macro-carbs)" strokeWidth={14} strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={-(segment + gap)} />
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--macro-gordura)" strokeWidth={14} strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={-2 * (segment + gap)} />
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--macro-fibra)" strokeWidth={14} strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={-3 * (segment + gap)} />
      </g>
      <path d="M78 102l14 14 30-30" fill="none" stroke="var(--forest)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(35,45) rotate(-20)">
        <path d="M0 -7c4 2 4 9 0 13c-4-4-4-11 0-13z" fill="var(--forest)" />
      </g>
      <path d="M165 40v12M159 46h12" stroke="var(--amber)" strokeWidth={3} strokeLinecap="round" />
    </>
  );
}

const ILLUSTRATIONS: Record<BrandIllustrationVariant, () => JSX.Element> = {
  onboarding: OnboardingIllustration,
  "empty-plan": EmptyPlanIllustration,
  generating: GeneratingIllustration,
  "empty-shopping": EmptyShoppingIllustration,
  "onboarding-success": OnboardingSuccessIllustration,
};

export function BrandIllustration({ variant, size = 180 }: BrandIllustrationProps) {
  const Illustration = ILLUSTRATIONS[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <Illustration />
    </svg>
  );
}
