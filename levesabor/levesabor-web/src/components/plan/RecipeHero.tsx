// FE-Q04 · RecipeHero — foto de destaque do detalhe da receita, 4:3; sem foto cai num gradiente
// da marca + ícone (mesma família visual do fallback do DishGallery na landing), com a mesma
// altura da foto, para o resto do ecrã não saltar de posição consoante a receita tenha foto ou não.
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import styles from "./RecipeHero.module.css";

export type RecipeHeroProps = {
  photoSrc?: string;
  alt: string;
};

export function RecipeHero({ photoSrc, alt }: RecipeHeroProps) {
  if (!photoSrc) {
    return (
      <div className={styles.fallback} aria-hidden="true">
        <UtensilsCrossed size={40} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <Image src={photoSrc} alt={alt} fill sizes="(max-width: 640px) 100vw, 640px" className={styles.photo} priority />
    </div>
  );
}
