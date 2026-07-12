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
    navigateFallbackDenylist: [/^\/admin/],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default withPWA(nextConfig);
