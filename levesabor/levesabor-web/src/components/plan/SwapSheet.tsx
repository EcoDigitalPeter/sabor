// FE-C05/FE-Q06 · SwapSheet — bottom-sheet da troca de refeição (T-05, F1-CLI-05)
// Maioritariamente apresentacional: recebe a alternativa já proposta (POST .../swap sem confirm)
// e delega "Confirmar troca"/"Manter" para quem a monta (a página trata a chamada com
// confirm=true, a invalidação de queries e o fecho da folha). O motivo livre e opcional
// (FE-Q06) é estado só desta folha — a página só o recebe já pronto no callback `onConfirm`.
"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import type { components } from "@/types/api";
import styles from "./SwapSheet.module.css";

type RecipeSnapshot = components["schemas"]["RecipeSnapshot"];

// Mesmo limite do campo de nota em compras/encomendar (F3-CLI-07), para consistência.
const MAX_REASON_LENGTH = 140;

const REASON_SUGGESTIONS = [
  "Não gosto deste prato",
  "Quero algo mais rápido",
  "Tenho estes ingredientes em casa",
];

export type SwapSheetProps = {
  open: boolean;
  /** Receita alternativa proposta pelo backend (POST .../swap, sem confirm). */
  alternative: RecipeSnapshot | null;
  /** true enquanto o POST .../swap?confirm=true está em curso — desativa as ações. */
  confirming?: boolean;
  /** Recebe o motivo livre já aparado (undefined se o campo ficou vazio). */
  onConfirm: (reason?: string) => void;
  onKeep: () => void;
};

export function SwapSheet({ open, alternative, confirming = false, onConfirm, onKeep }: SwapSheetProps) {
  const [reason, setReason] = useState("");

  // Reinicia o motivo sempre que a folha (re)abre — evita reaproveitar texto de uma troca
  // anterior já confirmada/mantida (SwapSheet fica sempre montada; só a BottomSheet interna é
  // que desmonta o conteúdo em `open=false`).
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  function handleConfirm() {
    onConfirm(reason.trim() || undefined);
  }

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

          <FormField
            label="Porque queres trocar? (opcional)"
            htmlFor="swap-reason"
            hint={`${reason.length}/${MAX_REASON_LENGTH} caracteres`}
          >
            <Input
              id="swap-reason"
              type="text"
              value={reason}
              maxLength={MAX_REASON_LENGTH}
              placeholder="ex.: não gosto deste prato"
              onChange={(event) => setReason(event.target.value)}
              disabled={confirming}
            />
          </FormField>

          <div className={styles.reasonChipRow}>
            {REASON_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={styles.chipButton}
                onClick={() => setReason(suggestion)}
                disabled={confirming}
              >
                <Chip variant={reason === suggestion ? "tan" : "cream"}>{suggestion}</Chip>
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="primary" onClick={handleConfirm} loading={confirming} disabled={confirming}>
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
