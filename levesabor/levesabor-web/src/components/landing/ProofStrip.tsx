// FE-P06 · ProofStrip — faixa de prova honesta (produto pré-lançamento, sem testemunhos/contadores
// inventados): só afirmações verificáveis sobre o que o produto É, hoje.
import styles from "./ProofStrip.module.css";

const CLAIMS = [
  "Feito em Moçambique, para Moçambique",
  "Pratos 100% locais — da matapa à mucapata",
  "Pensado para pouca internet e pouco dado",
  "Grátis durante o lançamento",
];

export function ProofStrip() {
  return (
    <div className={styles.strip}>
      {CLAIMS.map((claim) => (
        <p key={claim} className={styles.claim}>
          {claim}
        </p>
      ))}
    </div>
  );
}
