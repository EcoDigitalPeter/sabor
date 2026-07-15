"use client";

// FE-A04 · Wrapper "use client" para providers globais — o layout raiz é Server Component
// e não pode passar a instância de QueryClient (classe) como prop através da fronteira RSC.
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api";
import { ToastProvider } from "@/components/ui/Toast";
import { MockProvider } from "@/mocks/MockProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MockProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </MockProvider>
  );
}
