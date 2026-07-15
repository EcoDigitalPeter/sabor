// FE-C05 · SwapSheet — bottom-sheet da troca de refeição (T-05, F1-CLI-05)
// Puramente apresentacional: recebe a alternativa já proposta (POST .../swap sem confirm) e
// delega "Confirmar troca"/"Manter" para quem a monta (a página trata a chamada com
// confirm=true, a invalidação de queries e o fecho da folha).
"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import type { components } from "@/types/api";
import styles from "./SwapSheet.module.css";

type RecipeSnapshot = components["schemas"]["RecipeSnapshot"];

export type SwapSheetProps = {
  open: boolean;
  /** Receita alternativa proposta pelo backend (POST .../swap, sem confirm). */
  alternative: RecipeSnapshot | null;
  /** true enquanto o POST .../swap?confirm=true está em curso — desativa as ações. */
  confirming?: boolean;
  onConfirm: () => void;
  onKeep: () => void;
};

export function SwapSheet({ open, alternative, confirming = false, onConfirm, onKeep }: SwapSheetProps) {
  return (
    <BottomSheet open={open} onClose={onKeep}>
      {alternative ? (
        <div className={styles.container}>
          <p className={styles.eyebrow}>Alternativa proposta</p>
          <h2 className={styles.name}>{alternative.name}</h2>

          <div className={styles.ringRow}>
            <MacroRing
              size="sm"
              kcal={alternative.kcal ?? 0}
              macros={{
                proteina: alternative.macros?.proteina ?? 0,
                carbs: alternative.macros?.carbs ?? 0,
                gordura: alternative.macros?.gordura ?? 0,
                fibra: alternative.macros?.fibra ?? 0,
              }}
            />
            <span className={styles.kcalLabel}>{alternative.kcal ?? 0} kcal</span>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="primary" onClick={onConfirm} loading={confirming} disabled={confirming}>
              Confirmar troca
            </Button>
            <Button type="button" variant="secondary" onClick={onKeep} disabled={confirming}>
              Manter
            </Button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}
