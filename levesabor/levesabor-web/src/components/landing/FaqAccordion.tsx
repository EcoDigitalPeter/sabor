"use client";
// FE-P01 · FaqAccordion — acordeão do FAQ (project/Leve Sabor AI.dc.html linhas 242-260)
import { useState } from "react";
import styles from "./FaqAccordion.module.css";

const FAQS = [
  {
    q: "Os meus dados de saúde ficam seguros?",
    a: "Sim. As informações sobre a tua saúde servem apenas para gerar o teu plano e nunca são partilhadas com terceiros ou vendidas.",
  },
  {
    q: "Funciona com pouco dado móvel ou internet instável?",
    a: "É uma prioridade de design: a Leve Sabor está a ser pensada para pesar pouco em dados, com os planos gerados a ficarem guardados no teu telemóvel.",
  },
  {
    q: "Isto substitui o meu nutricionista ou médico?",
    a: "Não, nunca. A Leve Sabor é uma ferramenta de apoio — as decisões sobre a tua saúde continuam sempre com o teu médico ou nutricionista.",
  },
  {
    q: "Preciso de saber cozinhar bem para seguir os planos?",
    a: "Não. As receitas são simples, com ingredientes comuns e passos diretos — pensadas para o dia a dia, não para uma cozinha profissional.",
  },
  {
    q: "Quanto custa?",
    a: "Durante o lançamento, é grátis. Se um dia houver planos pagos, haverá sempre uma versão gratuita e avisamos com antecedência.",
  },
  {
    q: "Preciso de cartão de crédito para criar conta?",
    a: "Não. Só precisas de um email — não pedimos nenhum dado de pagamento para começar.",
  },
  {
    q: "Quando posso começar a usar?",
    a: "Já — a Leve Sabor está em acesso antecipado. Cria a tua conta e recebe o teu primeiro plano em minutos.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(index: number) {
    setOpenIndex((current) => (current === index ? null : index));
  }

  return (
    <div className={styles.list}>
      {FAQS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.q} className={styles.item}>
            <button type="button" className={styles.trigger} onClick={() => toggle(index)} aria-expanded={isOpen}>
              <span>{item.q}</span>
              <span
                className={[styles.icon, isOpen ? styles.iconOpen : ""].filter(Boolean).join(" ")}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <div className={[styles.answerWrap, isOpen ? styles.answerWrapOpen : ""].filter(Boolean).join(" ")}>
              <p className={styles.answer}>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
