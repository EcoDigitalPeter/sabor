"use client";

// FE-A04 · Wrapper "use client" para providers globais — o layout raiz é Server Component
// e não pode passar a instância de QueryClient (classe) como prop através da fronteira RSC.
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api";
import { initAuthListener } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";
import { MockProvider } from "@/mocks/MockProvider";

// INT-01 · Regista, uma única vez, o listener que sincroniza a sessão da aplicação
// com o SDK Supabase (login/logout noutro separador, restauro num reload). Sem
// efeito quando NEXT_PUBLIC_USE_MOCKS=true — não há Supabase real por trás dos mocks.
function AuthListener() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") return;
    return initAuthListener();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MockProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthListener />
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </MockProvider>
  );
}
