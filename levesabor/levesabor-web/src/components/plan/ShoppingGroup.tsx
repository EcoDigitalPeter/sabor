// FE-C06 · ShoppingGroup — grupo colapsável por categoria da lista de compras (T-06, F1-CLI-06)
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { CategoryIcon, type ShoppingCategory } from "@/components/ui/CategoryIcon";
import type { ShoppingListItem } from "@/hooks/useShoppingList";
import styles from "./ShoppingGroup.module.css";

export const CATEGORY_LABEL: Record<ShoppingCategory, string> = {
  CEREAIS_E_FARINHAS: "Cereais e farinhas",
  PROTEINA: "Proteína",
  VEGETAIS_E_FOLHAS: "Vegetais e folhas",
  LEGUMINOSAS: "Leguminosas",
  TEMPEROS_E_OLEOS: "Temperos e óleos",
  OUTROS: "Outros",
};

export type ShoppingGroupProps = {
  category: ShoppingCategory;
  items: ShoppingListItem[];
  /** Colapsado/expandido é estado local do grupo; começa expandido por omissão. */
  defaultExpanded?: boolean;
  onToggleItem: (id: number, checked: boolean) => void;
};

export function ShoppingGroup({ category, items, defaultExpanded = true, onToggleItem }: ShoppingGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <section className={styles.group}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span className={styles.headerLeft}>
          <CategoryIcon category={category} size={22} />
          <span className={styles.title}>{CATEGORY_LABEL[category]}</span>
          <span className={styles.count}>
            {checkedCount}/{items.length}
          </span>
        </span>
        <ChevronDown
          className={[styles.chevron, expanded ? styles.chevronExpanded : ""].filter(Boolean).join(" ")}
          size={20}
          aria-hidden="true"
        />
      </button>

      {expanded ? (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <Checkbox
                label={<span className={styles.itemName}>{item.ingredientName}</span>}
                checked={item.checked ?? false}
                onChange={(event) => {
                  if (item.id === undefined) return;
                  onToggleItem(item.id, event.target.checked);
                }}
              />
              <span className={styles.quantity}>
                {item.quantity} {item.unit}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
