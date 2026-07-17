// FE-C08 · OfflineBanner — aviso "sem ligação" mostrado quando `useOnlineStatus()` reporta offline;
// usado em plano/page.tsx e compras/page.tsx para avisar que o conteúdo visível é a última versão
// guardada em cache pelo service worker (StaleWhileRevalidate, next.config.mjs).
import { WifiOff } from "lucide-react";
import styles from "./OfflineBanner.module.css";

export type OfflineBannerProps = {
  /** Mensagem em português claro — o que está a ser mostrado é a última versão em cache. */
  message: string;
  className?: string;
};

export function OfflineBanner({ message, className }: OfflineBannerProps) {
  return (
    <div role="status" className={[styles.banner, className].filter(Boolean).join(" ")}>
      <WifiOff className={styles.icon} aria-hidden="true" size={18} strokeWidth={2} />
      <p className={styles.message}>{message}</p>
    </div>
  );
}
