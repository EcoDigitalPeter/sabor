// FE-Y08 (ago/2026) · StoresMiniMap — "um pequeno mapa com a localização das lojas aumentaria
// muito a confiança" (feedback do cliente). SVG próprio, sem biblioteca de mapas nem tiles
// externos (mesma abordagem de MacroRing/MonthProgressRing) — mostra a posição relativa das
// lojas entre si, não coordenadas geográficas exactas, por isso o rótulo é honesto sobre isso
// ("aproximado", ver também o comentário em mocks/fixtures.ts sobre a origem das coordenadas).
import type { components } from "@/types/api";
import styles from "./StoresMiniMap.module.css";

type Store = components["schemas"]["Store"];

export type StoresMiniMapProps = {
  stores: Store[];
  selectedStoreId: number | null;
  className?: string;
};

const VIEWBOX = 300;
const PADDING = 30;

export function StoresMiniMap({ stores, selectedStoreId, className }: StoresMiniMapProps) {
  const located = stores.filter(
    (store): store is Store & { id: number; latitude: number; longitude: number } =>
      store.id !== undefined && store.latitude != null && store.longitude != null,
  );

  if (located.length === 0) return null;

  const lats = located.map((s) => s.latitude);
  const lngs = located.map((s) => s.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;
  const usable = VIEWBOX - PADDING * 2;

  function project(lat: number, lng: number): { x: number; y: number } {
    const x = PADDING + ((lng - minLng) / lngSpan) * usable;
    // Latitude cresce para norte; y de SVG cresce para baixo — inverte.
    const y = PADDING + (1 - (lat - minLat) / latSpan) * usable;
    return { x, y };
  }

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(" ")}>
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className={styles.svg}
        role="img"
        aria-label="Mapa com a posição relativa das lojas"
      >
        <rect x={0} y={0} width={VIEWBOX} height={VIEWBOX} className={styles.background} rx={16} />
        {located.map((store) => {
          const { x, y } = project(store.latitude, store.longitude);
          const isSelected = store.id === selectedStoreId;
          return (
            <g key={store.id}>
              <circle cx={x} cy={y} r={isSelected ? 8 : 6} className={isSelected ? styles.pinSelected : styles.pin}>
                <title>{store.name}</title>
              </circle>
              {isSelected ? (
                <text x={x} y={y - 14} textAnchor="middle" className={styles.pinLabel}>
                  {store.name}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <p className={styles.caption}>Localização aproximada das lojas</p>
    </div>
  );
}
