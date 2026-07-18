"use client";
// FE-P04/FE-P07 · DishGallery — galeria de 8 pratos moçambicanos; clique expande com MacroRing +
// CTA (padrão da Fotor: cartões de prato clicáveis). Mostra a foto real quando existe
// (`dish.image`, gerada via public/images/pratos/PROMPT.md); sem foto, cai no placeholder em
// círculo/ícone — a página nunca depende de um asset existir.
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { Chip } from "@/components/ui/Chip";
import { Reveal } from "./Reveal";
import { DISH_GALLERY } from "./dish-gallery-data";
import styles from "./DishGallery.module.css";

export function DishGallery() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={styles.grid}>
      {DISH_GALLERY.map((dish, index) => {
        const isOpen = expanded === dish.slug;
        return (
          <Reveal key={dish.slug} delay={(index % 4) * 60}>
            <div className={styles.cardWrap}>
              <button
                type="button"
                className={styles.trigger}
                aria-expanded={isOpen}
                onClick={() => setExpanded(isOpen ? null : dish.slug)}
              >
                {dish.image ? (
                  <div className={styles.photoWrap}>
                    <Image
                      src={dish.image}
                      alt={dish.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 320px"
                      className={styles.photo}
                    />
                  </div>
                ) : (
                  <div className={styles.visual} aria-hidden="true">
                    <UtensilsCrossed size={26} strokeWidth={1.6} />
                  </div>
                )}
                <div className={styles.info}>
                  <p className={styles.name}>{dish.name}</p>
                  <p className={styles.sensory}>{dish.sensory}</p>
                  <div className={styles.chips}>
                    <Chip variant="tan">{`${dish.kcal} kcal`}</Chip>
                    <Chip variant="tan">{`${dish.minutes} min`}</Chip>
                    <Chip variant="cream">{dish.tag}</Chip>
                  </div>
                </div>
              </button>
              <div className={[styles.expandWrap, isOpen ? styles.expandWrapOpen : ""].filter(Boolean).join(" ")}>
                <div className={styles.expandInner}>
                  <MacroRing macros={dish.macros} kcal={dish.kcal} size="md" />
                  <div className={styles.expandText}>
                    <p className={styles.expandNote}>{dish.note}</p>
                    <Link href="/registo" className={styles.expandCta}>
                      Quero isto no meu plano →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
