import { Link } from "wouter";
import AppShell from "@/components/AppShell";
import CollectionPointsMap from "@/components/CollectionPointsMap";
import StatusBadge from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";

export default function MapPage() {
  const points = trpc.points.list.useQuery();
  return (
    <AppShell hideFooter>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold sm:text-3xl">Mapa de pontos</h1><p className="mt-1 text-sm text-muted-foreground">Pontos de coleta verificados em Taquaritinga-SP — selecione um marcador para ver detalhes.</p></div><div className="flex items-center gap-3 text-xs"><Legend color="var(--success)" text="Ativo" /><Legend color="var(--warning)" text="Próximo" /><Legend color="var(--danger)" text="Lotado" /></div></div><div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]"><div className="h-[70vh] min-h-[420px]">{points.isLoading ? <div className="h-full animate-pulse rounded-2xl bg-muted" /> : <CollectionPointsMap points={points.data ?? []} />}</div><aside className="card-soft h-[70vh] overflow-y-auto p-4"><h2 className="mb-3 font-semibold">Pontos ({points.data?.length ?? 0})</h2>{points.isError ? <p className="text-sm text-muted-foreground">Não foi possível carregar os pontos.</p> : <ul className="space-y-2">{points.data?.map((point) => <li key={point.id}><Link href={`/pontos/${point.id}`} className="block rounded-xl p-3 transition hover:bg-muted"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{point.name}</span><StatusBadge status={point.capacityStatus} /></div><div className="mt-1 text-xs text-muted-foreground">{point.neighborhood} · {point.address}</div></Link></li>)}{points.data?.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Ainda não há pontos aprovados.</li>}</ul>}</aside></div></div>
    </AppShell>
  );
}

function Legend({ color, text }: { color: string; text: string }) { return <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{text}</span>; }
