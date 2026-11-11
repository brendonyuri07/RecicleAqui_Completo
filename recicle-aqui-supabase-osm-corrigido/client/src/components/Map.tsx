import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

export interface MapViewProps {
  className?: string;
  initialCenter?: L.LatLngExpression;
  initialZoom?: number;
  onMapReady?: (map: L.Map) => void;
}

export function MapView({
  className,
  initialCenter = [-21.406, -48.505],
  initialZoom = 13,
  onMapReady,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const initial = useRef({ center: initialCenter, zoom: initialZoom });
  const ready = useRef(onMapReady);
  ready.current = onMapReady;
  const tiles = useRef<L.TileLayer | null>(null);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, initial.current);
    const layer = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }
    );
    layer.on("tileerror", () => setTileError(true));
    layer.on("tileload", () => setTileError(false));
    layer.addTo(map);
    tiles.current = layer;
    const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resize.observe(container.current);
    ready.current?.(map);
    return () => {
      resize.disconnect();
      layer.off();
      tiles.current = null;
      map.remove();
    };
  }, []);

  return (
    <div className={cn("relative isolate h-[500px] w-full", className)}>
      <div
        ref={container}
        aria-label="Mapa de pontos de coleta"
        className="relative z-0 h-full w-full"
      />
      {tileError && (
        <div
          role="status"
          className="absolute inset-x-3 top-3 z-10 ml-12 rounded-lg border border-border bg-card/95 p-3 text-sm text-foreground shadow-md"
        >
          Não foi possível carregar parte do mapa. Verifique sua conexão.
          <button
            type="button"
            className="ml-2 font-semibold text-primary underline"
            onClick={() => {
              setTileError(false);
              tiles.current?.redraw();
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
