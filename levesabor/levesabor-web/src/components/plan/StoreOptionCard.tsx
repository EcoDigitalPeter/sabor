"use client";

import { Check } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import type { components } from "@/types/api";
import styles from "./StoreOptionCard.module.css";

type Store = components["schemas"]["Store"];
type StorePriceLevel = NonNullable<Store["averagePriceLevel"]>;

const PRICE_LEVEL_LABEL: Record<StorePriceLevel, string> = {
  BAIXO: "Preço baixo",
  MEDIO: "Preço médio",
  ALTO: "Preço alto",
};

export type StoreOptionCardProps = {
  store: Store;
  selected: boolean;
  onSelect: () => void;
};

export function StoreOptionCard({ store, selected, onSelect }: StoreOptionCardProps) {
  const location = [store.neighborhood, store.city].filter(Boolean).join(", ");
  const meta = [location, store.contact].filter(Boolean).join(" · ");
  const priceLabel = store.averagePriceLevel ? PRICE_LEVEL_LABEL[store.averagePriceLevel] : null;
  const hasBadges = store.deliveryAvailable || !!store.openingHoursText || !!priceLabel;
  const ratingLabel = store.rating == null ? null : `Nota ${store.rating.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}`;

  return (
    <button
      type="button"
      className={[styles.card, selected ? styles.selected : ""].filter(Boolean).join(" ")}
      onClick={onSelect}
      aria-pressed={selected}
    >
      {selected ? (
        <span className={styles.checkBadge} aria-hidden="true">
          <Check size={12} strokeWidth={3} />
        </span>
      ) : null}
      <div className={styles.headerRow}>
        <span className={styles.name}>{store.name}</span>
        {ratingLabel ? <span className={styles.headerMeta}>{ratingLabel}</span> : null}
      </div>
      {meta ? <span className={styles.meta}>{meta}</span> : null}
      {hasBadges ? (
        <div className={styles.badgeRow}>
          {store.deliveryAvailable ? <Chip variant="cream">Entrega disponível</Chip> : null}
          {store.openingHoursText ? <Chip variant="cream">{store.openingHoursText}</Chip> : null}
          {priceLabel ? <Chip variant="cream">{priceLabel}</Chip> : null}
        </div>
      ) : null}
    </button>
  );
}
