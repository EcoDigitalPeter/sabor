# components/ui — biblioteca base (cartões FE-B01..B04, B06, B08)

Um ficheiro por componente; todos consomem apenas `styles/tokens.css`. Paralelos entre si:

| Cartão | Componentes |
|---|---|
| FE-B01 | `Button.tsx` (pílula 100px, loading/disabled) · `Input.tsx` · `Select.tsx` · `Checkbox.tsx` |
| FE-B02 | `Card.tsx` · `Chip.tsx` (mono, estilo landing) · `StatusBadge.tsx` |
| FE-B03 | `Toast.tsx` (2,5s) · `Modal.tsx` · `ConfirmDialog.tsx` (simples/dupla) · `BottomSheet.tsx` |
| FE-B04 | `Skeleton.tsx` · `EmptyState.tsx` (ilustração+título+CTA) · `ErrorState.tsx` (retry) |
| FE-B06 | `FormField.tsx` (react-hook-form + zod, erro inline) |
| FE-B08 | `Wizard.tsx` (1 pergunta/ecrã, progresso, rascunho local) |

Foco visível obrigatório: `outline: var(--focus-on-light|--focus-on-dark)`.
