"use client";
// FE-P01 · FaqAccordion — acordeão do FAQ (project/Leve Sabor AI.dc.html linhas 242-260)
import { useState } from "react";
import styles from "./FaqAccordion.module.css";

const FAQS = [
  {
    q: "Os meus dados de saúde ficam seguros?",
    a: "Sim. As informações sobre a tua saúde servem apenas para gerar o teu plano e nunca são vendidas nem partilhadas sem a tua autorização.",
  },
  {
    q: "Funciona com pouco dado móvel ou internet instável?",
    a: "É uma prioridade de design: a Ottimizo está a ser pensada para pesar pouco em dados, com os planos gerados a ficarem guardados no teu telemóvel.",
  },
  {
    q: "Isto substitui o meu nutricionista ou médico?",
    a: "Não, nunca. A Ottimizo é uma ferramenta de apoio — as decisões sobre a tua saúde continuam sempre com o teu médico ou nutricionista.",
  },
  {
    q: "Preciso de experiência na cozinha?",
    a: "Não. As receitas são explicadas passo a passo e adaptadas ao teu nível de experiência.",
  },
  {
    q: "Quanto custa?",
    a: "Podes começar gratuitamente. Os planos pagos serão apresentados de forma transparente, sem custos escondidos.",
  },
  {
    q: "Preciso de cartão de crédito para criar conta?",
    a: "Não. Só precisas de um email — não pedimos nenhum dado de pagamento para começar. Quando houver planos pagos, aceitaremos os métodos de pagamento disponíveis no teu país.",
  },
  {
    q: "Quando posso começar a usar?",
    a: "Já — a Ottimizo está em acesso antecipado. Cria a tua conta e recebe o teu primeiro plano em minutos.",
  },
  {
    q: "A IA cria receitas ou usa receitas reais?",
    a: "A IA trabalha com receitas reais e adapta-as ao teu perfil, objetivos, preferências e restrições alimentares.",
  },
  {
    q: "Posso escolher o tipo de cozinha que prefiro?",
    a: "O catálogo cresce com o tempo. Hoje o foco são pratos moçambicanos reais, adaptados ao teu gosto e perfil.",
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
