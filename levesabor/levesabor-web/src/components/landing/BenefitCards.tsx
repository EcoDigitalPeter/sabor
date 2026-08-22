// FE-P04/FE-P07 · BenefitCards — quarteto de benefícios (server component, dados estáticos).
// Ícones em public/images/beneficios/*.svg (gerados a partir do PROMPT.md dessa pasta); <img>
// simples em vez de next/image, por serem SVGs decorativos pequenos e locais.
import styles from "./BenefitCards.module.css";

const BENEFITS = [
  {
    icon: "/images/beneficios/poupa-tempo.svg",
    title: "Poupa tempo",
    body: "Deixa de pensar “o que faço hoje?”. O plano da semana chega pronto.",
  },
  {
    icon: "/images/beneficios/orcamento.svg",
    title: "Cabe no orçamento",
    body: "Dizes quanto podes gastar; as receitas respeitam isso.",
  },
  {
    icon: "/images/beneficios/sabor.svg",
    title: "Come melhor, sem abdicar do sabor",
    body: "Menos sal, menos açúcar — sem perder o prazer de comer bem.",
  },
  {
    icon: "/images/beneficios/saude.svg",
    title: "Cuida da tua saúde, ao teu ritmo",
    body: "Planos adaptados à tua condição, preferências e objectivos.",
  },
];

export function BenefitCards() {
  return (
    <div className={styles.grid}>
      {BENEFITS.map(({ icon, title, body }) => (
        <div key={title} className={styles.card}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} alt="" aria-hidden="true" width={44} height={44} className={styles.icon} />
          <p className={styles.title}>{title}</p>
          <p className={styles.body}>{body}</p>
        </div>
      ))}
    </div>
  );
}
