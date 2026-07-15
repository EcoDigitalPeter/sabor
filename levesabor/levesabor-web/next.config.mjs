// FE-A01 · Esqueleto Next.js + PWA — ver docs/plano/02-ui-ux-plan.md §5
// Service worker só em produção; rotas /admin excluídas do cache (dados sensíveis).
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    // FE-C08: runtime cache stale-while-revalidate para plano ativo e lista de compras
    runtimeCaching: [
      {
        urlPattern: /\/api\/v1\/me\/(meal-plans\/active|shopping-list)$/,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "levesabor-plano" },
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default withPWA(nextConfig);
