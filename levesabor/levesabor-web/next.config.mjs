// FE-A01 · Esqueleto Next.js + PWA — ver docs/plano/02-ui-ux-plan.md §5
// Service worker só em produção; rotas /admin excluídas do cache (dados sensíveis).
import withPWAInit from "@ducanh2912/next-pwa";
// FE-E02 · Bundle analyzer (ad-hoc, via `npm run analyze`) — ver docs/plano/tasks.md.
// Inativo por omissão (ANALYZE!=true), logo não tem custo em builds normais.
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});

const withPWA = withPWAInit({
  dest: "public",
  // Desligado em dev (comportamento original) e sempre que os mocks MSW estão ativos — os dois
  // service workers (next-pwa e mockServiceWorker.js) disputariam o mesmo scope "/" (FE-P01).
  disable: process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_USE_MOCKS === "true",
  workboxOptions: {
    // FE-C08: runtime cache stale-while-revalidate para plano ativo e lista de compras
    runtimeCaching: [
      {
        urlPattern: /\/api\/v1\/me\/(meal-plans\/active|shopping-list)$/,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "ottimizo-plano" },
      },
    ],
    // FE-C08: nenhuma entrada explícita de NetworkOnly é necessária para /api/v1/admin/**.
    // `extendDefaultRuntimeCaching` (default: false) não está ativo, logo este array `runtimeCaching`
    // SUBSTITUI por completo o `defaultCache` do next-pwa — que é quem, por omissão, teria uma regra
    // genérica de NetworkFirst para qualquer `/api/*`. Sem essa regra genérica e sem nenhum padrão
    // aqui que corresponda a `/api/v1/admin/**`, o workbox nunca regista uma rota para esses pedidos:
    // o service worker não os intercepta, não os guarda em cache e nunca os serve stale — seguem
    // sempre diretamente para a rede, como sem SW. Se algum dia `extendDefaultRuntimeCaching: true`
    // for ligado (para herdar outras regras por omissão), então sim passa a ser preciso um
    // `NetworkOnly` explícito aqui para `/api/v1/admin/**` antes dessa regra genérica.
    navigateFallbackDenylist: [/^\/admin/],
  },
});

// "standalone" é para deploys self-hosted/Docker (bundle mínimo com servidor Node próprio).
// A Vercel tem o seu próprio pipeline de build/serve e não usa este modo — mantê-lo ligado não é
// fatal, mas muda como o Next traça/empacota dependências do servidor e é uma fonte conhecida de
// problemas de resolução de assets na Vercel. Reintroduzir só se um alvo de deploy não-Vercel precisar.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// withBundleAnalyzer por fora: só embrulha o output final do withPWA para injetar o
// plugin de análise no webpack config; a ordem entre os dois não afeta o comportamento do
// PWA porque o analyzer não altera entries/chunks, só inspeciona o resultado.
export default withBundleAnalyzer(withPWA(nextConfig));
