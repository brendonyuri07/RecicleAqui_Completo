import { LocateFixed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import AppShell from "@/components/AppShell";
import CollectionPointsMap, {
  type MapRouteDestination,
} from "@/components/CollectionPointsMap";
import QueryError from "@/components/QueryError";
import StatusBadge from "@/components/StatusBadge";
import { MATERIALS, type Material } from "@/lib/domain";
import { trpc } from "@/lib/trpc";

export default function MapPage() {
  const points = trpc.points.list.useQuery();
  const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [routeDestination, setRouteDestination] =
    useState<MapRouteDestination>();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [locationPending, setLocationPending] = useState(false);
  const [locationError, setLocationError] = useState("");
  const visiblePoints = useMemo(
    () =>
      (points.data ?? []).filter(point =>
        selectedMaterials.every(material => point.materials.includes(material))
      ),
    [points.data, selectedMaterials]
  );

  useEffect(() => {
    if (selectedId && !visiblePoints.some(point => point.id === selectedId)) {
      setSelectedId(undefined);
      setRouteDestination(undefined);
    }
  }, [selectedId, visiblePoints]);

  const toggleMaterial = (material: Material) => {
    setSelectedMaterials(current =>
      current.includes(material)
        ? current.filter(item => item !== material)
        : [...current, material]
    );
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Este dispositivo não disponibiliza localização GPS.");
      return;
    }
    setLocationPending(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocationError("");
        setLocationPending(false);
      },
      () => {
        setLocationError(
          "Não foi possível obter sua localização. Verifique a permissão do navegador."
        );
        setLocationPending(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const selectDestination = (destination: MapRouteDestination) => {
    setSelectedId(destination.pointId);
    setRouteDestination(destination);
    if (!currentLocation) requestLocation();
  };

  const clearRoute = () => {
    setSelectedId(undefined);
    setRouteDestination(undefined);
  };

  return (
    <AppShell hideFooter>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Mapa de pontos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pontos de coleta verificados em Taquaritinga-SP.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Legend color="var(--success)" text="Ativo" />
              <Legend color="var(--warning)" text="Próximo da capacidade" />
              <Legend color="var(--danger)" text="Lotado" />
            </div>
            <button
              type="button"
              className="btn-outline"
              onClick={requestLocation}
              disabled={locationPending}
            >
              <LocateFixed className="h-4 w-4" />
              {locationPending ? "Localizando…" : "Minha localização"}
            </button>
          </div>
        </div>
        {locationError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {locationError}
          </p>
        )}
        <section
          aria-label="Filtrar pontos por material"
          className="card-soft mt-5 flex flex-wrap items-center gap-2 p-4"
        >
          <span className="mr-1 text-sm font-medium">Materiais aceitos:</span>
          {MATERIALS.map(material => (
            <button
              key={material}
              type="button"
              onClick={() => toggleMaterial(material)}
              aria-pressed={selectedMaterials.includes(material)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${selectedMaterials.includes(material) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
            >
              {material}
            </button>
          ))}
          {selectedMaterials.length > 0 && (
            <button
              type="button"
              className="ml-auto text-xs font-medium text-primary underline underline-offset-4"
              onClick={() => setSelectedMaterials([])}
            >
              Limpar filtros
            </button>
          )}
        </section>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="h-[55vh] min-h-[340px] lg:h-[70vh]">
            <CollectionPointsMap
              points={visiblePoints}
              selectedId={selectedId}
              currentLocation={currentLocation}
              routeDestination={routeDestination}
              onSelectDestination={selectDestination}
              onClearRoute={clearRoute}
            />
          </div>
          <aside className="card-soft max-h-[70vh] overflow-y-auto p-4">
            <h2 className="mb-3 font-semibold">
              Pontos{points.data ? ` (${visiblePoints.length})` : ""}
            </h2>
            {points.isLoading ? (
              <p role="status" className="py-4 text-sm text-muted-foreground">
                Carregando pontos…
              </p>
            ) : points.isError ? (
              <QueryError
                compact
                title="Não foi possível carregar os pontos"
                retry={() => void points.refetch()}
              />
            ) : (
              <ul className="space-y-2">
                {visiblePoints.map(point => (
                  <li
                    key={point.id}
                    className={`rounded-xl border p-3 ${selectedId === point.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      aria-label={`Selecionar ${point.name} como destino`}
                      aria-pressed={routeDestination?.pointId === point.id}
                      onClick={() =>
                        selectDestination({
                          latitude: point.latitude,
                          longitude: point.longitude,
                          name: point.name,
                          pointId: point.id,
                        })
                      }
                    >
                      <span className="mb-2 block text-sm font-semibold">
                        {point.name}
                      </span>
                      <StatusBadge status={point.capacityStatus} />
                      <span className="mt-2 block text-xs text-muted-foreground">
                        {point.neighborhood} · {point.address}
                      </span>
                    </button>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Link
                        href={`/pontos/${point.id}`}
                        className="text-xs font-semibold text-primary underline underline-offset-4"
                      >
                        Ver detalhes
                      </Link>
                    </div>
                  </li>
                ))}
                {visiblePoints.length === 0 && (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    {selectedMaterials.length
                      ? "Nenhum ponto aceita todos os materiais selecionados."
                      : "Ainda não há pontos aprovados."}
                  </li>
                )}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {text}
    </span>
  );
}
