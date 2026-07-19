// FE-P01/FE-P06 · LandingPage — landing v2 (project/Leve Sabor AI.dc.html + plano "excitação")
import Image from "next/image";
import Link from "next/link";
import { UserRound, Sparkles, BookOpen, ShoppingBasket, Store } from "lucide-react";
import { LandingNav } from "./LandingNav";
import { HeroQuiz } from "./HeroQuiz";
import { FaqAccordion } from "./FaqAccordion";
import { ProofStrip } from "./ProofStrip";
import { BenefitCards } from "./BenefitCards";
import { DishGallery } from "./DishGallery";
import { ProductShowcase } from "./ProductShowcase";
import { Reveal } from "./Reveal";
import { Chip } from "@/components/ui/Chip";
import styles from "./LandingPage.module.css";

const STEPS = [
  { num: "01", title: "Perfil", desc: "Conta-nos o teu objetivo, condições de saúde e o que gostas de comer.", icon: UserRound },
  { num: "02", title: "A IA gera o plano", desc: "A Leve Sabor cria um plano semanal com pratos moçambicanos reais.", icon: Sparkles },
  { num: "03", title: "Receitas", desc: "Cada refeição vem com receita simples e ingredientes fáceis de encontrar.", icon: BookOpen },
  { num: "04", title: "Lista de compras", desc: "Recebes a lista da semana, organizada e sem desperdício.", icon: ShoppingBasket },
  {
    num: "05",
    title: "Encomenda à loja parceira",
    desc: "Passa a lista para uma encomenda e combina entrega/pagamento diretamente com a loja.",
    icon: Store,
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

export function LandingPage() {
  return (
    <div className={styles.page}>
      <LandingNav />

      <section id="top" className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>Comida moçambicana de verdade. Um plano feito para ti.</h1>
            <p className={styles.heroSubtitle}>
              Diz-nos o teu objetivo e a tua saúde. A Leve Sabor devolve um plano semanal com matapa, xima, caril —
              ajustado ao teu orçamento.
            </p>
            <div className={styles.heroActions}>
              <a href="#demo" className={styles.heroPrimaryCta}>
                Cria o teu plano de exemplo
              </a>
              <a href="#como-funciona" className={styles.heroSecondaryCta}>
                Ver como funciona ↓
              </a>
            </div>
            <p className={styles.heroMicrocopy}>Grátis · sem cartão de crédito · 2 minutos</p>
            <p className={styles.heroDisclaimer}>
              A Leve Sabor não substitui o teu médico ou nutricionista — trabalha sempre a par de quem já cuida da
              tua saúde.
            </p>
          </div>
          <div className={styles.heroDemo}>
            <Image
              src="/images/hero-prato/hero-prato.webp"
              alt=""
              width={960}
              height={960}
              priority
              className={styles.heroPhoto}
              aria-hidden="true"
            />
            <div className={styles.heroPhotoOverlay} aria-hidden="true" />
            <div className={styles.heroPhotoBadge} aria-hidden="true">
              <Sparkles size={13} strokeWidth={2} className={styles.heroPhotoBadgeIcon} />
              <span>
                <strong>Sugestão do Dia</strong> — Matapa com Caranguejo e Xima
              </span>
            </div>
            <HeroQuiz />
          </div>
        </div>
      </section>

      <ProofStrip />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <BenefitCards />
        </div>
      </section>

      <section id="pratos" className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Pratos que já conheces</h2>
          <p className={styles.sectionLead}>
            Toca num prato para ver as calorias e macros — é assim que cada refeição do teu plano vai aparecer.
          </p>
          <DishGallery />
        </div>
      </section>

      <section id="como-funciona" className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Como funciona</h2>
          <p className={styles.sectionLead}>Cinco passos, do teu perfil à encomenda.</p>
          <div className={styles.stepsGrid}>
            {STEPS.map((step, index) => (
              <Reveal key={step.num} delay={index * 70}>
                <div className={styles.stepCard}>
                  <step.icon size={22} strokeWidth={1.6} className={styles.stepIcon} aria-hidden="true" />
                  <span className={styles.stepNum}>{step.num}</span>
                  <p className={styles.stepTitle}>{step.title}</p>
                  <p className={styles.stepDesc}>{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Link href="/registo" className={styles.stepsCta}>
            Começa pelo passo 01 — Criar conta grátis
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Vê o que vais receber</h2>
          <p className={styles.sectionLead}>Sem fotos de stock — os componentes que já usamos no produto real.</p>
          <ProductShowcase />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Pede. A Leve Sabor responde.</h2>
          <p className={styles.sectionLead}>Exemplos reais do tipo de pedido que podes fazer — e do que recebes de volta.</p>
          <div className={styles.orderGrid}>
            {ORDER_CARDS.map((card, index) => (
              <Reveal key={card.dish} delay={index * 60}>
                <div className={styles.orderCard}>
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
              </Reveal>
            ))}
          </div>
          <Link href="/registo" className={styles.stepsCta}>
            Cria a tua conta e faz o teu primeiro pedido →
          </Link>
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
          <div>
            <p className={styles.trustEyebrow}>Em desenvolvimento aberto</p>
            <p className={styles.trustVision}>
              A Leve Sabor está em construção — ainda sem utilizadores, sem promessas infladas. Os primeiros a
              entrar moldam o produto: cada feedback chega diretamente à equipa.
            </p>
            <a href="mailto:ola@levesabor.ai" className={styles.trustContact}>
              Fala connosco: ola@levesabor.ai
            </a>
          </div>
        </div>
      </section>

      <section id="faq" className={styles.section}>
        <div className={styles.faqInner}>
          <h2 className={styles.sectionTitle}>Perguntas diretas</h2>
          <FaqAccordion />
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <p className={styles.ctaTitle}>A tua primeira semana de planos está à espera.</p>
          <p className={styles.ctaLead}>
            Conta grátis, sem cartão. O plano chega em minutos — com comida que já conheces.
          </p>
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
              <p className={styles.footerDisclaimer}>
                A Leve Sabor AI não substitui aconselhamento médico ou nutricional profissional. Consulta sempre o
                teu médico antes de mudanças significativas na tua alimentação, sobretudo se tiveres uma condição de
                saúde diagnosticada.
              </p>
            </div>
            <div className={styles.footerContact}>
              <p className={styles.footerContactLabel}>Contacto</p>
              <a href="mailto:ola@levesabor.ai" className={styles.footerLink}>
                ola@levesabor.ai
              </a>
            </div>
          </div>
          <p className={styles.footerCopyright}>© 2026 Leve Sabor AI</p>
        </div>
      </footer>
    </div>
  );
}
