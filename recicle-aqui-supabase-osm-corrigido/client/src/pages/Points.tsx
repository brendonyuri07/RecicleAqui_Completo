import { Link } from "wouter";
import { MapPin, Plus, Search, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import QueryError from "@/components/QueryError";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { MATERIALS, type Material, pointImage } from "@/lib/domain";
import { trpc } from "@/lib/trpc";

export default function Points() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Material[]>([]);
  const input = useMemo(
    () => ({ search: search || undefined, materials: selected }),
    [search, selected]
  );
  const points = trpc.points.list.useQuery(input);
  const toggle = (material: Material) =>
    setSelected(current =>
      current.includes(material)
        ? current.filter(item => item !== material)
        : [...current, material]
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Pontos de coleta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {points.data
                ? points.data.length + " pontos verificados"
                : "Pontos de coleta"}{" "}
              em Taquaritinga-SP
            </p>
          </div>
          <Link href="/pontos/novo" className="btn-primary">
            <Plus className="h-4 w-4" /> Cadastrar ponto
          </Link>
        </div>
        <div className="card-soft mt-6 flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por bairro, nome ou endereço..."
              aria-label="Buscar pontos"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {MATERIALS.map(material => (
              <button
                key={material}
                onClick={() => toggle(material)}
                aria-pressed={selected.includes(material)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${selected.includes(material) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
              >
                {material}
              </button>
            ))}
          </div>
        </div>
        {points.isLoading ? (
          <LoadingCards />
        ) : points.isError ? (
          <QueryError
            title="N?o foi poss?vel carregar os pontos"
            retry={() => void points.refetch()}
          />
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {points.data?.map(point => (
              <article
                key={point.id}
                className="card-soft flex flex-col overflow-hidden"
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={pointImage(point)}
                    alt={point.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{point.name}</h2>
                    <StatusBadge status={point.capacityStatus} />
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {point.neighborhood} · {point.address}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {point.openingHours}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {point.materials.map(material => (
                      <span
                        key={material}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary-dark"
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/pontos/${point.id}`}
                    className="btn-outline mt-5 self-start"
                  >
                    Visualizar
                  </Link>
                </div>
              </article>
            ))}
            {points.data?.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                Nenhum ponto encontrado com esses filtros.
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function LoadingCards() {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="card-soft animate-pulse overflow-hidden">
          <div className="aspect-[16/10] bg-muted" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
