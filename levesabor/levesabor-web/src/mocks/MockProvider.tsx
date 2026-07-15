"use client";
// FE-P01 · MockProvider — arranca o MSW no browser quando NEXT_PUBLIC_USE_MOCKS=true, e só
// renderiza os filhos depois do worker estar pronto a intercetar pedidos (evita a corrida em que
// o primeiro fetch/query dispara antes do service worker ficar ativo). Import dinâmico de "./browser"
// para que `msw` não entre no bundle inicial quando os mocks estão desligados.
import { useEffect, useState } from "react";

const MOCKS_ENABLED = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!MOCKS_ENABLED);

  useEffect(() => {
    if (!MOCKS_ENABLED) return;
    let cancelled = false;
    import("./browser").then(({ startWorker }) => {
      startWorker()
        .then(() => {
          if (!cancelled) setReady(true);
        })
        .catch((err) => {
          // Don't leave the app permanently blank if the mock worker fails to start —
          // log it and let real (unmocked) requests through instead.
          console.error("[MockProvider] failed to start MSW worker", err);
          if (!cancelled) setReady(true);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
