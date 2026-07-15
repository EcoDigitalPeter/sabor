// FE-P01 · Browser MSW worker — só arranca quando NEXT_PUBLIC_USE_MOCKS=true (ver MockProvider)
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
