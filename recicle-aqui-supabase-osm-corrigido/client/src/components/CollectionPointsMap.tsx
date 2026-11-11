import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { X } from "lucide-react";
import { MapView } from "@/components/Map";
import type { CollectionPoint } from "@/lib/domain";
import { statusLabel } from "@/lib/domain";

const colors: Record<CollectionPoint["capacityStatus"], string> = {
  ativo: "#22a06b",
  proximo: "#e0a82e",
  lotado: "#dc4034",
};

export type MapRouteDestination = {
  latitude: number;
  longitude: number;
  name: string;
  pointId?: number;
};

export default function CollectionPointsMap({
  points,
  selectedId,
  currentLocation,
  routeDestination,
  onSelectDestination,
  onClearRoute,
}: {
  points: CollectionPoint[];
  selectedId?: number;
  currentLocation?: { latitude: number; longitude: number };
  routeDestination?: MapRouteDestination;
  onSelectDestination?: (destination: MapRouteDestination) => void;
  onClearRoute?: () => void;
}) {
  const [map, setMap] = useState<L.Map | null>(null);
  const markersRef = useRef(new Map<number, L.Marker>());
  const pointsRef = useRef(new Map<number, CollectionPoint>());
  const selectDestinationRef = useRef(onSelectDestination);
  selectDestinationRef.current = onSelectDestination;
  const [routeDistance, setRouteDistance] = useState<number>();
  const [routeStatus, setRouteStatus] = useState<"loading" | "error">();
  const onMapReady = useCallback((nextMap: L.Map) => setMap(nextMap), []);

  useEffect(() => {
    if (!map) return;

    const validPoints = points.filter(
      point =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        Math.abs(point.latitude) <= 90 &&
        Math.abs(point.longitude) <= 180
    );
    const nextPointIds = new Set(validPoints.map(point => point.id));
    markersRef.current.forEach((marker, pointId) => {
      if (!nextPointIds.has(pointId)) {
        marker.remove();
        markersRef.current.delete(pointId);
        pointsRef.current.delete(pointId);
      }
    });

    validPoints.forEach(point => {
      pointsRef.current.set(point.id, point);
      let marker = markersRef.current.get(point.id);
      if (!marker) {
        const newMarker = L.marker([point.latitude, point.longitude], {
          icon: pointIcon(point, point.id === selectedId),
          keyboard: true,
          title: point.name,
          alt: `Ponto de reciclagem: ${point.name}`,
        }).addTo(map);
        newMarker.on("add", () => showMarkerFallbackOnError(newMarker));
        showMarkerFallbackOnError(newMarker);
        newMarker.on("click", event => {
          L.DomEvent.stopPropagation(event.originalEvent);
          const currentPoint = pointsRef.current.get(point.id);
          if (!currentPoint) return;
          selectDestinationRef.current?.({
            latitude: currentPoint.latitude,
            longitude: currentPoint.longitude,
            name: currentPoint.name,
            pointId: currentPoint.id,
          });
        });
        newMarker.on("popupopen", event => {
          const image = event.popup
            .getElement()
            ?.querySelector<HTMLImageElement>(".collection-point-popup-image");
          if (!image) return;
          const showFallback = () => {
            image.hidden = true;
            const fallback = image.nextElementSibling;
            if (fallback instanceof HTMLElement) fallback.hidden = false;
          };
          if (image.complete && image.naturalWidth === 0) {
            showFallback();
          } else {
            image.addEventListener("error", showFallback, { once: true });
          }
        });
        markersRef.current.set(point.id, newMarker);
        marker = newMarker;
      } else {
        marker.setLatLng([point.latitude, point.longitude]);
        marker.setIcon(pointIcon(point, point.id === selectedId));
        showMarkerFallbackOnError(marker);
        marker
          .getElement()
          ?.setAttribute("title", `Ponto de reciclagem: ${point.name}`);
      }
      marker.bindPopup(pointPopup(point));
    });
  }, [map, points]);

  useEffect(() => {
    if (!map) return;
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();
      pointsRef.current.clear();
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    markersRef.current.forEach((marker, pointId) => {
      const point = pointsRef.current.get(pointId);
      if (point) {
        marker.setIcon(pointIcon(point, pointId === selectedId));
        showMarkerFallbackOnError(marker);
      }
    });
    markersRef.current.forEach(marker => marker.closePopup());
    map.closePopup();
    const selected = markersRef.current.get(selectedId ?? -1);
    if (selected) {
      map.setView(selected.getLatLng(), 15);
      selected.openPopup();
    } else if (markersRef.current.size) {
      const bounds = L.featureGroup(
        Array.from(markersRef.current.values())
      ).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
      }
    }
  }, [map, points, selectedId]);

  useEffect(() => {
    if (!map) return;
    const handleMapClick = (event: L.LeafletMouseEvent) => {
      selectDestinationRef.current?.({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        name: "Destino selecionado no mapa",
      });
    };
    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !currentLocation) return;
    const marker = L.circleMarker(
      [currentLocation.latitude, currentLocation.longitude],
      {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 1,
      }
    )
      .addTo(map)
      .bindPopup("Origem: sua localização atual");
    map.setView(marker.getLatLng(), 15);
    return () => {
      marker.remove();
    };
  }, [map, currentLocation]);

  useEffect(() => {
    if (!map || !currentLocation || !routeDestination) {
      setRouteStatus(undefined);
      setRouteDistance(undefined);
      return;
    }

    const controller = new AbortController();
    let route: L.Polyline | undefined;
    let destinationMarker: L.CircleMarker | undefined;
    setRouteStatus("loading");
    setRouteDistance(undefined);
    const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${routeDestination.longitude},${routeDestination.latitude}?overview=full&geometries=geojson`;
    fetch(url, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Route request failed");
        return (await response.json()) as {
          code: string;
          routes?: {
            distance: number;
            geometry: { coordinates: [number, number][] };
          }[];
        };
      })
      .then(result => {
        const routeResult = result.routes?.[0];
        const coordinates = routeResult?.geometry.coordinates;
        if (result.code !== "Ok" || !routeResult || !coordinates?.length)
          throw new Error("Route unavailable");
        route = L.polyline(
          coordinates.map(([longitude, latitude]) => [latitude, longitude]),
          { color: "#0f766e", weight: 6, opacity: 0.85 }
        ).addTo(map);
        destinationMarker = L.circleMarker(
          [routeDestination.latitude, routeDestination.longitude],
          {
            radius: 10,
            color: "#ffffff",
            weight: 3,
            fillColor: "#dc2626",
            fillOpacity: 1,
          }
        )
          .addTo(map)
          .bindPopup(`Destino: ${escapeHtml(routeDestination.name)}`);
        map.fitBounds(route.getBounds(), { padding: [32, 32], maxZoom: 16 });
        setRouteDistance(routeResult.distance);
        setRouteStatus(undefined);
      })
      .catch(error => {
        if (error instanceof Error && error.name === "AbortError") return;
        setRouteStatus("error");
      });

    return () => {
      controller.abort();
      route?.remove();
      destinationMarker?.remove();
    };
  }, [map, currentLocation, routeDestination]);

  const distanceLabel =
    routeDistance === undefined
      ? ""
      : routeDistance >= 1000
        ? `${(routeDistance / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`
        : `${Math.round(routeDistance)} m`;

  return (
    <div className="h-full overflow-hidden rounded-2xl border border-border bg-card">
      <MapView
        className="h-full"
        initialCenter={[-21.406, -48.505]}
        initialZoom={13}
        onMapReady={onMapReady}
      />
      {routeStatus && (
        <div
          role={routeStatus === "error" ? "alert" : "status"}
          className="absolute inset-x-3 top-3 z-10 ml-12 rounded-lg border border-border bg-card/95 p-3 text-sm text-foreground shadow-md"
        >
          {routeStatus === "loading"
            ? "Calculando rota…"
            : "Não foi possível calcular a rota. Tente novamente com outra conexão."}
        </div>
      )}
      {routeDestination && (
        <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-3 rounded-lg border border-border bg-card/95 p-3 text-sm text-foreground shadow-md sm:inset-x-auto sm:left-3 sm:min-w-64">
          <div role="status" className="min-w-0">
            {routeDistance !== undefined ? (
              <>
                <span className="block text-xs text-muted-foreground">
                  Distância aproximada
                </span>
                <strong>{distanceLabel}</strong>
                <span className="ml-1 text-muted-foreground">
                  {" "}
                  · até {routeDestination.name}
                </span>
              </>
            ) : routeStatus === "loading" ? (
              <span>Calculando trajeto até {routeDestination.name}…</span>
            ) : (
              <span>Destino: {routeDestination.name}</span>
            )}
          </div>
          <button
            type="button"
            className="btn-outline shrink-0 !px-2.5"
            aria-label="Limpar rota"
            title="Limpar rota"
            onClick={onClearRoute}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    char =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ] ?? char
  );
}

function safeImageUrl(value: string | null) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function pointIcon(point: CollectionPoint, selected: boolean) {
  const photoUrl = safeImageUrl(point.photoUrl);
  const size = selected ? 52 : 46;
  const fallback = `<span class="collection-point-marker-fallback"${photoUrl ? " hidden" : ""} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m7 7 3-3 3 3M10 4v5m8 2 2 3-4 1m4-4-4 7m-8 0-3-3 3-3m-3 3h8m1-12 2 4-2 4M8 7l4 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  const image = photoUrl
    ? `<img class="collection-point-marker-image" src="${escapeHtml(photoUrl)}" alt="" loading="lazy" decoding="async" />`
    : "";
  return L.divIcon({
    className: "collection-point-div-icon",
    html: `<span class="collection-point-marker${selected ? " is-selected" : ""}" style="--point-status-color:${colors[point.capacityStatus]}">${image}${fallback}<span class="collection-point-marker-status" aria-hidden="true"></span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function showMarkerFallbackOnError(marker: L.Marker) {
  const image = marker
    .getElement()
    ?.querySelector<HTMLImageElement>(".collection-point-marker-image");
  if (!image) return;
  const fallback = image.nextElementSibling;
  if (!(fallback instanceof HTMLElement)) return;
  const showFallback = () => {
    image.hidden = true;
    fallback.hidden = false;
  };
  if (image.complete && image.naturalWidth === 0) {
    showFallback();
    return;
  }
  image.addEventListener("error", showFallback, { once: true });
}

function pointPopup(point: CollectionPoint) {
  const photoUrl = safeImageUrl(point.photoUrl);
  const materials = point.materials.length
    ? point.materials.map(material => escapeHtml(material)).join(" · ")
    : "Materiais não informados";
  const photo = photoUrl
    ? `<div class="collection-point-popup-photo"><img class="collection-point-popup-image" src="${escapeHtml(photoUrl)}" alt="Foto de ${escapeHtml(point.name)}" loading="lazy" decoding="async" /><div class="collection-point-popup-fallback" hidden aria-label="Foto indisponível"><span aria-hidden="true">♻</span></div></div>`
    : `<div class="collection-point-popup-fallback" aria-label="Ponto sem foto"><span aria-hidden="true">♻</span></div>`;
  return `<div class="collection-point-popup">${photo}<strong class="collection-point-popup-name">${escapeHtml(point.name)}</strong><span class="collection-point-popup-neighborhood">${escapeHtml(point.neighborhood)}</span><span class="collection-point-popup-address">${escapeHtml(point.address)}</span><span class="collection-point-popup-status">${escapeHtml(statusLabel[point.capacityStatus])}</span><span class="collection-point-popup-materials"><strong>Aceita:</strong> ${materials}</span><a class="collection-point-popup-link" href="/pontos/${point.id}">Ver detalhes →</a></div>`;
}
