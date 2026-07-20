// FE-R01 · ShoppingItemRow — item da lista de compras: checkbox "comprado" + "já tenho um pouco"
// (quantidade que o cliente já tem em casa, subtraída da quantidade a comprar). Ver spec em
// docs/superpowers/specs/2026-07-19-lista-compras-ja-tenho-design.md.
"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import type { ShoppingListItem } from "@/hooks/useShoppingList";
import styles from "./ShoppingItemRow.module.css";

export type ShoppingItemRowProps = {
  item: ShoppingListItem;
  onToggleChecked: (checked: boolean) => void;
  onChangeHaveQuantity: (haveQuantity: number) => void;
};

export function ShoppingItemRow({ item, onToggleChecked, onChangeHaveQuantity }: ShoppingItemRowProps) {
  const quantity = item.quantity ?? 0;
  const haveQuantity = item.haveQuantity ?? 0;
  const remaining = Math.max(0, quantity - haveQuantity);
  const covered = quantity > 0 && remaining <= 0;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(haveQuantity || ""));

  function commit() {
    const parsed = Number.parseFloat(draft.replace(",", "."));
    onChangeHaveQuantity(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
    setEditing(false);
  }

  return (
    <li className={[styles.item, covered ? styles.itemCovered : ""].filter(Boolean).join(" ")}>
      <div className={styles.mainRow}>
        <Checkbox
          label={<span className={styles.itemName}>{item.ingredientName}</span>}
          checked={item.checked ?? false}
          onChange={(event) => {
            if (item.id === undefined) return;
            onToggleChecked(event.target.checked);
          }}
        />
        <span className={styles.quantity}>
          {covered ? "0" : remaining} {item.unit}
        </span>
      </div>

      <div className={styles.pantryRow}>
        {editing ? (
          <div className={styles.pantryEdit}>
            <span className={styles.pantryLabel}>Já tenho</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoFocus
              className={styles.pantryInput}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit();
                }
              }}
            />
            <span className={styles.pantryLabel}>{item.unit}</span>
          </div>
        ) : haveQuantity > 0 ? (
          <button type="button" className={styles.pantryNote} onClick={() => setEditing(true)}>
            de {quantity} {item.unit}, já tens {haveQuantity} {item.unit}
          </button>
        ) : (
          <button type="button" className={styles.pantryLink} onClick={() => setEditing(true)}>
            Já tenho um pouco
          </button>
        )}
      </div>
    </li>
  );
}
