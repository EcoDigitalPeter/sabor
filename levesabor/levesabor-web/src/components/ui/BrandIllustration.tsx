import Image from "next/image";

export type BrandIllustrationVariant =
  | "onboarding"
  | "empty-plan"
  | "generating"
  | "empty-shopping"
  | "onboarding-success"
  | "generic-error"
  | "empty-orders"
  | "empty-recipes-search";

export type BrandIllustrationProps = {
  variant: BrandIllustrationVariant;
  size?: number;
};

const IMAGE_SRC: Record<BrandIllustrationVariant, string> = {
  onboarding: "/images/onboarding/onboarding.png",
  "empty-plan": "/images/empty-plano/empty-plano.png",
  generating: "/images/geracao-ia/geracao-ia.png",
  "empty-shopping": "/images/empty-compras/empty-compras.png",
  "onboarding-success": "/images/onboarding-sucesso/onboarding-sucesso.png",
  "generic-error": "/images/error-generico/error-generico.svg",
  "empty-orders": "/images/empty-encomendas/empty-encomendas.svg",
  "empty-recipes-search": "/images/empty-busca-receitas/empty-busca-receitas.svg",
};

export function BrandIllustration({ variant, size = 180 }: BrandIllustrationProps) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size }} aria-hidden="true">
      <Image src={IMAGE_SRC[variant]} alt="" fill sizes={`${size}px`} style={{ objectFit: "contain" }} />
    </span>
  );
}
