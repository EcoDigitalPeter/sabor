"use client";
// FE-P03 · useCountUp — anima um número inteiro de 0 até `target` (rAF). Ignorado sob
// prefers-reduced-motion (salta logo para o valor final) e sempre que `active` for false.
import { useEffect, useState } from "react";

export function useCountUp(target: number, durationMs = 700, active = true): number {
  const [value, setValue] = useState(active ? 0 : target);

  useEffect(() => {
    if (!active) {
      setValue(target);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, active]);

  return value;
}
