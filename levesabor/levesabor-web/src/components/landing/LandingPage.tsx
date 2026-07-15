// FE-P01 · LandingPage — secções estáticas da landing pública (project/Leve Sabor AI.dc.html)
import Link from "next/link";
import { LandingNav } from "./LandingNav";
import { HeroQuiz } from "./HeroQuiz";
import { FaqAccordion } from "./FaqAccordion";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { Chip } from "@/components/ui/Chip";
import styles from "./LandingPage.module.css";

const STEPS = [
  { num: "01", title: "Perfil", desc: "Conta-nos o teu objetivo, condições de saúde e o que gostas de comer." },
  { num: "02", title: "A IA gera o plano", desc: "A Leve Sabor cria um plano semanal com pratos moçambicanos reais." },
  { num: "03", title: "Receitas", desc: "Cada refeição vem com receita simples e ingredientes fáceis de encontrar." },
  { num: "04", title: "Lista de compras", desc: "Recebes a lista da semana, organizada e sem desperdício." },
  {
    num: "05",
    title: "Encomenda à loja parceira",
    desc: "Passa a lista para uma encomenda e combina entrega/pagamento diretamente com a loja.",
  },
];

const ORDER_CARDS = [
  {
    pedido: "Cria um jantar barato com o que tenho em casa: ovos, tomate e arroz.",
    dish: "Omelete de tomate com arroz e folhas verdes",
    chips: ["480 kcal", "20 min", "custo baixo"],
  },
  {
    pedido: "Adapta esta receita de xima para quem tem diabetes tipo 2.",
    dish: "Xima de milho integral com peixe grelhado e quiabo",
    chips: ["520 kcal", "açúcar controlado", "35 min"],
  },
  {
    pedido: "Preciso de uma dieta para hipertensão sem perder o sabor.",
    dish: "Caril de peixe com especiarias e pouco sal",
    chips: ["560 kcal", "sódio reduzido", "40 min"],
  },
  {
    pedido: "Quero ganhar massa muscular comendo comida de casa.",
    dish: "Feijão nhemba com arroz, ovo e amendoim torrado",
    chips: ["710 kcal", "38g proteína", "45 min"],
  },
];

const SCENARIOS = [
  {
    title: "Perder peso",
    body: "Queres perder peso sem contar calorias à mão nem desistir da xima ao domingo.",
    color: "var(--terracotta)",
  },
  {
    title: "Ganhar massa",
    body: "Treinas e precisas de comer mais, com mais proteína, sem gastar uma fortuna.",
    color: "var(--amber)",
  },
  {
    title: "Diabetes tipo 2",
    body: "Foste diagnosticado com diabetes tipo 2 e não sabes por onde começar a mudar a alimentação.",
    color: "var(--forest)",
  },
  {
    title: "Hipertensão",
    body: "Tens hipertensão e o médico pediu para reduzires o sal — sem saber como cozinhar diferente.",
    color: "#8A5A3A",
  },
];

const SHOWCASE_MACROS = { proteina: 26, carbs: 48, gordura: 16, fibra: 10 };

export function LandingPage() {
  return (
    <div className={styles.page}>
      <LandingNav />

      <section id="top" className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>O teu plano alimentar, feito para a tua vida.</h1>
            <p className={styles.heroSubtitle}>
              A Leve Sabor cria planos alimentares à tua medida — com comida real, moçambicana, pensada para o teu
              orçamento, os teus gostos e a tua saúde.
            </p>
            <div className={styles.heroActions}>
              <a href="#demo" className={styles.heroPrimaryCta}>
                Cria o teu plano de exemplo
              </a>
              <a href="#como-funciona" className={styles.heroSecondaryCta}>
                Ver como funciona ↓
              </a>
            </div>
            <p className={styles.heroDisclaimer}>
              A Leve Sabor não substitui o teu médico ou nutricionista — trabalha sempre a par de quem já cuida da
              tua saúde.
            </p>
          </div>
          <div className={styles.heroDemo}>
            <HeroQuiz />
          </div>
        </div>
      </section>

      <section id="como-funciona" className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Como funciona</h2>
          <p className={styles.sectionLead}>Cinco passos, do teu perfil à encomenda.</p>
          <div className={styles.stepsGrid}>
            {STEPS.map((step) => (
              <div key={step.num} className={styles.stepCard}>
                <span className={styles.stepNum}>{step.num}</span>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Pede. A Leve Sabor responde.</h2>
          <p className={styles.sectionLead}>Exemplos reais do tipo de pedido que podes fazer — e do que recebes de volta.</p>
          <div className={styles.orderGrid}>
            {ORDER_CARDS.map((card) => (
              <div key={card.dish} className={styles.orderCard}>
                <div className={styles.orderRequest}>
                  <p className={styles.orderLabel}>Pedido</p>
                  <p className={styles.orderPedido}>&ldquo;{card.pedido}&rdquo;</p>
                </div>
                <div className={styles.orderResponse}>
                  <p className={styles.orderLabelResponse}>Leve Sabor diz</p>
                  <p className={styles.orderDish}>{card.dish}</p>
                  <div className={styles.orderChips}>
                    {card.chips.map((chip) => (
                      <Chip key={chip} variant="tan">
                        {chip}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.macroShowcase}>
          <div className={styles.macroRingWrap}>
            <MacroRing macros={SHOWCASE_MACROS} kcal={640} size="lg" />
          </div>
          <div className={styles.macroText}>
            <p className={styles.macroEyebrow}>Prato do dia</p>
            <p className={styles.macroDish}>Feijão nhemba com arroz e couve refogada</p>
            <p className={styles.macroNote}>Valores ilustrativos, por porção.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Para quem é</h2>
          <p className={styles.sectionLead}>Se te revês numa destas situações, é para ti.</p>
          <div className={styles.scenarioGrid}>
            {SCENARIOS.map((s) => (
              <div key={s.title} className={styles.scenarioCard} style={{ borderLeftColor: s.color }}>
                <p className={styles.scenarioTitle}>{s.title}</p>
                <p className={styles.scenarioBody}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.trustSection}>
        <div className={styles.trustInner}>
          <div>
            <p className={styles.trustEyebrow}>Porque isto importa</p>
            <p className={styles.trustHeadline}>
              Em Moçambique, cerca de 3 milhões de pessoas vivem com diabetes — e um nutricionista particular
              continua fora do alcance da maioria.
            </p>
            <p className={styles.trustBody}>
              O número de profissionais de saúde por habitante no país é reduzido, e nutricionistas especializados
              são ainda mais raros fora de Maputo. A Leve Sabor não substitui esse acompanhamento — existe para
              chegar a quem hoje não tem acesso a nenhum.
            </p>
          </div>
          <div>
            <p className={styles.trustEyebrowGreen}>A nossa visão</p>
            <p className={styles.trustVision}>
              Começámos a construir a Leve Sabor porque planos alimentares sérios existem — mas só para quem pode
              pagar uma consulta particular todos os meses.
            </p>
            <p className={styles.trustVision}>
              Queremos que qualquer moçambicano, com qualquer orçamento, tenha um plano pensado para si — com
              comida que já conhece e já gosta.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.faqInner}>
          <h2 className={styles.sectionTitle}>Perguntas diretas</h2>
          <FaqAccordion />
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <p className={styles.ctaTitle}>Sê dos primeiros a experimentar.</p>
          <p className={styles.ctaLead}>Cria a tua conta grátis e recebe o teu primeiro plano alimentar em minutos.</p>
          <Link href="/registo" className={styles.ctaButton}>
            Criar a minha conta grátis
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <span className={styles.footerWordmark}>
                leve <span className={styles.footerAccent}>sabor</span>
              </span>
              <p className={styles.footerTagline}>
                A nossa visão: comida real, adaptada a cada moçambicano — sem depender de quem pode pagar um
                nutricionista particular.
              </p>
            </div>
            <div className={styles.footerContact}>
              <p className={styles.footerContactLabel}>Contacto</p>
              <a href="mailto:ola@levesabor.ai" className={styles.footerLink}>
                ola@levesabor.ai
              </a>
            </div>
          </div>
          <p className={styles.footerDisclaimer}>
            A Leve Sabor AI não substitui aconselhamento médico ou nutricional profissional. Consulta sempre o teu
            médico antes de mudanças significativas na tua alimentação, sobretudo se tiveres uma condição de saúde
            diagnosticada.
          </p>
          <p className={styles.footerCopyright}>© 2026 Leve Sabor AI</p>
        </div>
      </footer>
    </div>
  );
}
