// FE-Y07 · ShoppingSummary — resumo da lista de compras (produtos/estimativa/comprados) mostrado
// ANTES dos botões de acção (feedback do cliente: "fica muito mais fácil perceber a situação").
// Junta 3 pedidos do mesmo round de feedback: impacto de custo "antes/depois" ao marcar "tenho em
// casa", barra de progresso visual (não literal em caracteres de bloco) e a mensagem de "rancho
// todo marcado" que antes vivia à parte em page.tsx.
import { Card } from "@/components/ui/Card";
import styles from "./ShoppingSummary.module.css";

export type ShoppingSummaryProps = {
  totalItems: number;
  checkedItems: number;
  /** Custo total dos itens por comprar, sem descontar o que o cliente já diz ter em casa ("antes"). */
  costBeforeMt: number;
  /** Custo a comprar depois de descontar "tenho em casa" (== ShoppingList.estimatedCostMt do mock). */
  costAfterMt: number;
  costIsPartial: boolean;
  className?: string;
};

function formatMt(value: number): string {
  // Separador de milhar por espaço, ao estilo do exemplo do próprio cliente ("2 048 MT").
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Regra da guia de copy (docs/plano/06-guia-de-copy-e-marca.md): nunca mostrar um indicador de
// progresso como número nu — emparelhar sempre com uma mensagem de contexto/encorajamento.
function progressMessage(checked: number, total: number): string {
  if (total === 0) return "";
  if (checked === 0) return "Vamos começar!";
  if (checked === total) return "Rancho todo marcado — bom trabalho.";
  const percent = Math.round((checked / total) * 100);
  if (percent < 50) return "Bom início, continua assim.";
  if (percent < 100) return "Já vai a meio — falta pouco.";
  return "";
}

export function ShoppingSummary({
  totalItems,
  checkedItems,
  costBeforeMt,
  costAfterMt,
  costIsPartial,
  className,
}: ShoppingSummaryProps) {
  const percent = totalItems > 0 ? Math.min(100, Math.round((checkedItems / totalItems) * 100)) : 0;
  // round2 já deixa os dois valores "iguais" quando não há poupança nenhuma — comparar arredondado
  // ao MT evita mostrar "Antes: 2048 MT → Depois: 2048 MT" por causa de resíduo de vírgula flutuante.
  const hasSavings = Math.round(costBeforeMt) !== Math.round(costAfterMt);

  return (
    <Card className={[styles.card, className].filter(Boolean).join(" ")}>
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <p className={styles.statValue}>{totalItems}</p>
          <p className={styles.statLabel}>{totalItems === 1 ? "produto" : "produtos"}</p>
        </div>
        <div className={styles.stat}>
          {hasSavings ? (
            <p className={styles.statValue}>
              <span className={styles.costBefore}>{formatMt(costBeforeMt)} MT</span>
              {" → "}
              {formatMt(costAfterMt)} MT
            </p>
          ) : (
            <p className={styles.statValue}>{formatMt(costAfterMt)} MT</p>
          )}
          <p className={styles.statLabel}>
            {hasSavings ? "estimativa com o que já tens em casa" : "estimativa"}
            {costIsPartial ? " · parcial" : ""}
          </p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statValue}>
            {checkedItems} de {totalItems}
          </p>
          <p className={styles.statLabel}>comprados</p>
        </div>
      </div>

      <div className={styles.progressWrap}>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da lista de compras"
        >
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
        <p className={styles.progressMessage}>{progressMessage(checkedItems, totalItems)}</p>
      </div>
    </Card>
  );
}
