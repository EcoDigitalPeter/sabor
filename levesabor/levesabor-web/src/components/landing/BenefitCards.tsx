// FE-P04 · BenefitCards — quarteto de benefícios (server component, dados estáticos).
// Ícones Lucide como fallback ship-ready; FE-P07 pode trocar por ilustrações de marca (P-10).
import { Clock, Wallet, UtensilsCrossed, HeartPulse } from "lucide-react";
import styles from "./BenefitCards.module.css";

const BENEFITS = [
  {
    icon: Clock,
    title: "Poupa tempo",
    body: "Deixa de pensar “o que faço hoje?”. O plano da semana chega pronto.",
  },
  {
    icon: Wallet,
    title: "Cabe no orçamento",
    body: "Dizes quanto podes gastar; as receitas respeitam isso.",
  },
  {
    icon: UtensilsCrossed,
    title: "Come melhor sem desistir do sabor",
    body: "Menos sal, menos açúcar — sem abrir mão da xima ao domingo.",
  },
  {
    icon: HeartPulse,
    title: "Cuida da tua saúde",
    body: "Diabetes, hipertensão, celíaca: planos que respeitam a tua condição.",
  },
];

export function BenefitCards() {
  return (
    <div className={styles.grid}>
      {BENEFITS.map(({ icon: Icon, title, body }) => (
        <div key={title} className={styles.card}>
          <Icon size={26} strokeWidth={1.6} className={styles.icon} aria-hidden="true" />
          <p className={styles.title}>{title}</p>
          <p className={styles.body}>{body}</p>
        </div>
      ))}
    </div>
  );
}
