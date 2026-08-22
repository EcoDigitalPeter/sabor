// FE-P01/FE-P06 · LandingPage — landing v2 (project/Leve Sabor AI.dc.html, pré-rebrand + plano "excitação")
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
import { Reveal } from "@/components/ui/Reveal";
import { Chip } from "@/components/ui/Chip";
import styles from "./LandingPage.module.css";

const STEPS = [
  {
    num: "01",
    title: "Perfil",
    desc: "Conta-nos os teus objectivos, preferências alimentares, restrições e orçamento.",
    icon: UserRound,
  },
  {
    num: "02",
    title: "A IA gera o plano",
    desc: "A IA cria um plano alimentar personalizado, adaptado aos teus objectivos, preferências e estilo de vida.",
    icon: Sparkles,
  },
  {
    num: "03",
    title: "Receitas",
    desc: "Cada refeição vem com receita clara e ingredientes simples e fáceis de encontrar.",
    icon: BookOpen,
  },
  {
    num: "04",
    title: "Lista de compras",
    desc: "Recebes automaticamente a lista da semana, organizada e sem desperdício.",
    icon: ShoppingBasket,
  },
  {
    num: "05",
    title: "Encomenda à loja parceira",
    desc: "Envia a tua lista para uma loja parceira ou utiliza-a nas tuas próprias compras.",
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
  {
    pedido: "Tenho 2.500 MT para alimentar uma família de 4 pessoas esta semana.",
    dish: "Feijão nhemba com arroz e couve refogada, planeado para 4 pessoas",
    chips: ["4 porções", "2.450 MT", "sem desperdício"],
  },
];

const SCENARIOS = [
  {
    title: "Emagrecer",
    body: "Queres emagrecer sem abdicar dos alimentos de que gostas.",
    color: "var(--terracotta)",
  },
  {
    title: "Ganhar massa muscular",
    body: "Treinas e precisas de comer mais — com um plano alimentar ajustado aos teus objectivos e orçamento.",
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
  {
    title: "Alimentação vegetariana",
    body: "Comes sem carne nem peixe e queres um plano completo em proteína e ferro, sem complicações.",
    color: "var(--amber-soft)",
  },
  {
    title: "Famílias",
    body: "Cozinhas para a família toda e queres refeições que agradem a todos, sem gastar a tarde a decidir.",
    color: "var(--terracotta-dark)",
  },
  {
    title: "Pouco tempo para cozinhar",
    body: "Os teus dias são cheios e precisas de refeições rápidas, sem abrir mão de comer bem.",
    color: "var(--forest)",
  },
];

export function LandingPage() {
  return (
    <div className={styles.page}>
      <LandingNav />

      <section id="top" className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>Alimentação inteligente, pensada para ti.</h1>
            <p className={styles.heroSubtitle}>
              Diz-nos o teu objectivo, as tuas preferências alimentares e o teu orçamento. A Ottimizo cria um plano semanal com
              refeições reais — ajustado a ti.
            </p>
            <div className={styles.heroActions}>
              <a href="#demo" className={styles.heroPrimaryCta}>
                Cria o teu plano de exemplo
              </a>
              <a href="#como-funciona" className={styles.heroSecondaryCta}>
                Ver como funciona ↓
              </a>
            </div>
            <p className={styles.heroMicrocopy}>
              {/* TODO(P-14): selo de confiança (ícone/ilustração) antes do texto — ver
                  docs/plano/07-prompts-ilustracoes-gaps.md. Sem imagem ainda; não inventar
                  placeholder — o pedido do cliente foi por "algo visual", não um ícone genérico. */}
              Grátis · sem cartão · 2 minutos
            </p>
            <p className={styles.heroDisclaimer}>
              A Ottimizo não substitui o teu médico ou nutricionista — trabalha sempre a par de quem já cuida da
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
          <h2 className={styles.sectionTitle}>Receitas feitas para ti</h2>
          <p className={styles.sectionLead}>
            Clica numa refeição para ver as calorias e os valores nutricionais — é assim que cada refeição do teu
            plano vai aparecer.
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
          <p className={styles.sectionLead}>
            Uma experiência simples, clara e pensada para o teu dia-a-dia — tudo organizado para facilitar as tuas
            decisões. Nada é escolhido ao acaso: cada receita é seleccionada de acordo com o teu perfil, objectivos,
            orçamento e preferências alimentares.
          </p>
          <ProductShowcase />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Pede. A Ottimizo responde.</h2>
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
                    <p className={styles.orderLabelResponse}>Ottimizo diz</p>
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
          <h2 className={styles.sectionTitle}>Feita para ti, se procuras...</h2>
          <p className={styles.sectionLead}>
            É para qualquer pessoa que queira organizar melhor a alimentação — estas são só algumas situações.
          </p>
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
              Todos os dias, milhões de pessoas enfrentam a mesma pergunta: &ldquo;O que vou cozinhar hoje?&rdquo;
            </p>
            <p className={styles.trustBody}>
              Entre a falta de tempo, o orçamento limitado, os objectivos de saúde e as diferentes preferências
              alimentares, decidir torna-se mais difícil do que deveria.
            </p>
          </div>
          <div>
            <p className={styles.trustEyebrowGreen}>A nossa visão</p>
            <p className={styles.trustVision}>
              Criámos a Ottimizo para transformar essa decisão num processo simples — um assistente inteligente
              que ajuda cada pessoa a planear refeições, cozinhar melhor, comprar apenas o necessário e cuidar da
              sua alimentação de forma personalizada.
            </p>
          </div>
          <div>
            <p className={styles.trustEyebrow}>O nosso compromisso</p>
            <p className={styles.trustVision}>
              Acreditamos que uma alimentação equilibrada deve ser acessível a todos — independentemente do
              orçamento, da experiência na cozinha ou do objectivo de cada pessoa.
            </p>
            <p className={styles.trustVision}>
              A Ottimizo não substitui médicos nem nutricionistas — complementa o seu trabalho, ajudando cada
              pessoa a tomar melhores decisões todos os dias.
            </p>
          </div>
          <div>
            <p className={styles.trustEyebrow}>Em desenvolvimento aberto</p>
            <p className={styles.trustVision}>
              A Ottimizo está em construção — ainda sem utilizadores, sem promessas infladas. Os primeiros a
              entrar moldam o produto: cada feedback chega diretamente à equipa.
            </p>
            <a href="mailto:ola@ottimizo.ai" className={styles.trustContact}>
              Fala connosco: ola@ottimizo.ai
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
            Conta grátis, sem cartão. O plano chega em minutos, feito à tua medida.
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
              <span className={styles.footerWordmark}>ottimizo</span>
              <p className={styles.footerTagline}>
                A nossa visão: comida real, adaptada a cada pessoa — sem depender de quem pode pagar um
                nutricionista particular.
              </p>
              <p className={styles.footerDisclaimer}>
                A Ottimizo não substitui aconselhamento médico ou nutricional profissional. Consulta sempre o
                teu médico antes de mudanças significativas na tua alimentação, sobretudo se tiveres uma condição de
                saúde diagnosticada.
              </p>
            </div>
            <div className={styles.footerContact}>
              <p className={styles.footerContactLabel}>Contacto</p>
              <a href="mailto:ola@ottimizo.ai" className={styles.footerLink}>
                ola@ottimizo.ai
              </a>
            </div>
          </div>
          <p className={styles.footerCopyright}>© 2026 Ottimizo</p>
        </div>
      </footer>
    </div>
  );
}
