// FE-C08 · useOnlineStatus — espelha navigator.onLine em estado React, atualizado pelos eventos
// `online`/`offline` do browser (docs/plano/02-ui-ux-plan.md §5). Sem lógica de deteção do service
// worker em si — só o sinal de rede do browser, como pedido no stub que substitui.
"use client";

import { useEffect, useState } from "react";

/**
 * Devolve `true` enquanto o browser reporta ligação à rede. Começa em `true` (assume-se online até
 * o efeito montar no cliente — evita mismatch de hidratação, já que `navigator` não existe em SSR).
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
