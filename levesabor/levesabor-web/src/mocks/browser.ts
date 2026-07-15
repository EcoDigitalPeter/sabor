// FE-P01 · Browser MSW worker — só arranca quando NEXT_PUBLIC_USE_MOCKS=true (ver MockProvider)
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

// React 18 Strict Mode (dev only) invokes effects twice; without this guard, MockProvider's
// effect would call worker.start() a second time on the same singleton, and MSW throws
// "cannot configure an already enabled network" on the repeat call. Caching the in-flight/
// resolved start promise makes repeated calls (StrictMode remount, HMR) idempotent.
let starting: ReturnType<typeof worker.start> | null = null;
export function startWorker() {
  if (!starting) {
    // If start() rejects (e.g. transient SW registration failure), clear the cache so the
    // next call retries instead of permanently reusing a dead, rejected promise.
    starting = worker.start({ onUnhandledRequest: "bypass" }).catch((err) => {
      starting = null;
      throw err;
    });
  }
  return starting;
}
