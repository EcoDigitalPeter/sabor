// FE-R01/FE-Y07 · ShoppingItemRow — item da lista de compras: checkbox "comprado" + selector
// "🏠 Tenho em casa" (quantidade que o cliente já tem em casa, subtraída da quantidade a comprar).
// FE-Y07 (feedback do cliente, ago/2026): o antigo link "Já tenho um pouco" que abria um campo de
// texto foi trocado por um selector [-]/[+] sempre visível — recalcula a quantidade em falta de
// imediato, sem precisar de tocar/editar nada. Hierarquia também mudou: nome → peso → "tenho em
// casa" (antes o peso vinha depois do link). Ver spec original em
// docs/superpowers/specs/2026-07-19-lista-compras-ja-tenho-design.md.
"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import type { ShoppingListItem } from "@/hooks/useShoppingList";
import styles from "./ShoppingItemRow.module.css";

export type ShoppingItemRowProps = {
  item: ShoppingListItem;
  onToggleChecked: (checked: boolean) => void;
  onChangeHaveQuantity: (haveQuantity: number) => void;
};

// Passo do selector "tenho em casa": unidades a granel (peso/volume) sobem de 50 em 50; unidades
// discretas ("unidade", "saqueta", "fatia"…) sobem de 1 em 1.
function haveStep(unit: string): number {
  return unit === "g" || unit === "ml" ? 50 : 1;
}

export function ShoppingItemRow({ item, onToggleChecked, onChangeHaveQuantity }: ShoppingItemRowProps) {
  const quantity = item.quantity ?? 0;
  const haveQuantity = item.haveQuantity ?? 0;
  const remaining = Math.max(0, quantity - haveQuantity);
  const covered = quantity > 0 && remaining <= 0;
  const unit = item.unit ?? "";
  const step = haveStep(unit);
  const checked = item.checked ?? false;

  function changeHave(delta: number) {
    onChangeHaveQuantity(Math.max(0, Math.round((haveQuantity + delta) * 100) / 100));
  }

  return (
    <li
      className={[styles.item, checked ? styles.itemChecked : "", covered ? styles.itemCovered : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.mainRow}>
        <Checkbox
          label={<span className={styles.itemName}>{item.ingredientName}</span>}
          checked={checked}
          onChange={(event) => {
            if (item.id === undefined) return;
            onToggleChecked(event.target.checked);
          }}
        />
        <span className={styles.quantity}>
          {covered ? "0" : remaining} {unit}
        </span>
      </div>

      <div className={styles.pantryRow}>
        <span className={styles.pantryLabel}>🏠 Tenho em casa</span>
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => changeHave(-step)}
            disabled={haveQuantity <= 0}
            aria-label={`Diminuir a quantidade que já tens de ${item.ingredientName ?? "item"}`}
          >
            −
          </button>
          <span className={styles.stepperValue}>
            {haveQuantity} {unit}
          </span>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => changeHave(step)}
            aria-label={`Aumentar a quantidade que já tens de ${item.ingredientName ?? "item"}`}
          >
            +
          </button>
        </div>
      </div>
    </li>
  );
}
