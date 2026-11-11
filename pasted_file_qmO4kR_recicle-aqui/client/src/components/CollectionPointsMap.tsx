import { useEffect, useState } from "react";
import { MapView } from "@/components/Map";
import type { CollectionPoint } from "@/lib/domain";
import { statusLabel } from "@/lib/domain";

const colors: Record<CollectionPoint["capacityStatus"], string> = {
  ativo: "#22a06b",
  proximo: "#e0a82e",
  lotado: "#dc4034",
};

export default function CollectionPointsMap({ points, selectedId }: { points: CollectionPoint[]; selectedId?: number }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!map || !window.google) return;
    const markers = points.map((point) => {
      const marker = new window.google!.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: point.latitude, lng: point.longitude },
        title: point.name,
      });
      const content = document.createElement("div");
      content.style.cssText = `background:${colors[point.capacityStatus]};border:2px solid white;border-radius:50%;width:${selectedId === point.id ? 24 : 19}px;height:${selectedId === point.id ? 24 : 19}px;box-shadow:0 1px 5px rgba(0,0,0,.35);cursor:pointer;`;
      marker.content = content;
      const info = new window.google!.maps.InfoWindow({ content: `<div style="min-width:185px;padding:2px"><strong>${escapeHtml(point.name)}</strong><br/><span>${escapeHtml(point.neighborhood)}</span><br/><span style="font-size:12px">${escapeHtml(point.address)}</span><br/><span style="font-size:12px">${escapeHtml(statusLabel[point.capacityStatus])}</span><br/><a href="/pontos/${point.id}" style="display:inline-block;margin-top:6px;color:#17663d;font-weight:600">Ver detalhes →</a></div>` });
      marker.addListener("click", () => info.open({ map, anchor: marker }));
      return marker;
    });
    return () => markers.forEach((marker) => { marker.map = null; });
  }, [map, points, selectedId]);

  return <div className="h-full overflow-hidden rounded-2xl border border-border bg-card"><MapView className="h-full" initialCenter={{ lat: -21.406, lng: -48.505 }} initialZoom={13} onMapReady={setMap} /></div>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}
