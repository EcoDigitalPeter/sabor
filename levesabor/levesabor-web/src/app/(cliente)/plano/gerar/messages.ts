// FE-C04 · T-07 A gerar plano — mensagens rotativas durante o polling (docs/plano/02-ui-ux-plan.md §3 T-07)
// FE-Y04 (ago/2026): frases realinhadas com a sugestão literal do cliente (feedback.txt L127-133)
// — aumenta a perceção de inteligência da plataforma durante a espera.
export const ROTATING_MESSAGES = [
  "🥗 A escolher receitas…",
  "🛒 A preparar a lista de compras…",
  "📊 A calcular a informação nutricional…",
  "✨ Quase pronto…",
] as const;

export const MESSAGE_ROTATE_INTERVAL_MS = 3500;
