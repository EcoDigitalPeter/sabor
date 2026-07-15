// FE-C04 · T-07 A gerar plano — mensagens rotativas durante o polling (docs/plano/02-ui-ux-plan.md §3 T-07)
export const ROTATING_MESSAGES = [
  "A escolher pratos moçambicanos para ti…",
  "A equilibrar as tuas macros…",
  "A montar a lista de compras…",
] as const;

export const MESSAGE_ROTATE_INTERVAL_MS = 3500;
