import {
  Activity,
  Check,
  HandHeart,
  MapPin,
  Pencil,
  ShieldCheck,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import { Link } from "wouter";
import AppShell, { RequireSession } from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/domain";
import { trpc } from "@/lib/trpc";

export default function Admin() {
  return (
    <AppShell>
      <RequireSession adminOnly>
        <AdminContent />
      </RequireSession>
    </AppShell>
  );
}

function AdminContent() {
  const utils = trpc.useUtils();
  const overview = trpc.admin.overview.useQuery();
  const refresh = () => {
    void utils.admin.overview.invalidate();
    void utils.points.list.invalidate();
    void utils.public.stats.invalidate();
    void utils.dashboard.mine.invalidate();
  };
  const review = trpc.points.review.useMutation({ onSuccess: refresh });
  const remove = trpc.points.remove.useMutation({ onSuccess: refresh });
  const data = overview.data;

  if (overview.isLoading)
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  if (!data)
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">
          Não foi possível carregar o painel.
        </h1>
        <button
          className="btn-primary mt-4"
          onClick={() => void overview.refetch()}
        >
          Tentar novamente
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-primary-dark">
          Administração
        </p>
        <h1 className="mt-1 text-3xl font-bold">Dashboard administrativo</h1>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Users} label="Usuários" value={String(data.stats.users)} />
        <Stat
          icon={HandHeart}
          label="Doadores"
          value={String(data.stats.donors)}
        />
        <Stat
          icon={Truck}
          label="Catadores"
          value={String(data.stats.collectors)}
        />
        <Stat
          icon={MapPin}
          label="Pontos ativos"
          value={String(data.stats.activePoints)}
        />
        <Stat
          icon={Activity}
          label="Novos cadastros"
          value={`+${data.stats.newUsers}`}
          hint="esta semana"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card-soft p-6">
          <h2 className="text-lg font-semibold">Pontos aguardando aprovação</h2>
          <div className="mt-4 space-y-3">
            {data.pendingPoints.length ? (
              data.pendingPoints.map(point => (
                <div
                  key={point.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{point.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {point.neighborhood} · {point.address}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {point.materials.map(material => (
                        <span
                          key={material}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary-dark"
                        >
                          {material}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      className="rounded-lg bg-primary/10 p-2 text-primary-dark hover:bg-primary/20"
                      title="Aprovar"
                      aria-label={`Aprovar ${point.name}`}
                      onClick={() =>
                        review.mutate({ id: point.id, status: "aprovado" })
                      }
                      disabled={review.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg bg-[color:var(--danger)]/10 p-2 text-[color:var(--danger)] hover:bg-[color:var(--danger)]/20"
                      title="Recusar"
                      aria-label={`Recusar ${point.name}`}
                      onClick={() =>
                        review.mutate({ id: point.id, status: "recusado" })
                      }
                      disabled={review.isPending}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-muted/50 p-5 text-sm text-muted-foreground">
                Não há pontos aguardando revisão.
              </div>
            )}
          </div>
          {review.isError && (
            <p role="alert" className="mt-3 text-sm text-[color:var(--danger)]">
              {review.error.message}
            </p>
          )}
        </section>

        <section className="card-soft p-6">
          <h2 className="text-lg font-semibold">Últimas atividades</h2>
          <ul className="mt-4 space-y-4 text-sm">
            {data.activities.length ? (
              data.activities.map(activity => (
                <li key={activity.id} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <div className="font-medium">{activity.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {activity.actorName ?? "Sistema"}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(activity.createdAt)}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">
                As ações da plataforma aparecerão aqui.
              </li>
            )}
          </ul>
        </section>
      </div>

      <section className="card-soft mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <h2 className="text-lg font-semibold">Gerenciar pontos</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Edite os dados ou remova pontos cadastrados.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {data.allPoints.length} no total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Ponto</th>
                <th className="p-3">Bairro</th>
                <th className="p-3">Aprovação</th>
                <th className="p-3">Capacidade</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.allPoints.map(point => (
                <tr key={point.id} className="border-t border-border">
                  <td className="p-3 font-medium">{point.name}</td>
                  <td className="p-3 text-muted-foreground">
                    {point.neighborhood}
                  </td>
                  <td className="p-3 text-xs capitalize">
                    {point.approvalStatus}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={point.capacityStatus} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/pontos/${point.id}/editar`}
                        className="rounded-md p-2 text-primary hover:bg-primary/10"
                        title={`Editar ${point.name}`}
                        aria-label={`Editar ${point.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        className="rounded-md p-2 text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
                        title={`Excluir ${point.name}`}
                        aria-label={`Excluir ${point.name}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Excluir definitivamente ${point.name}? Esta ação não pode ser desfeita.`
                            )
                          )
                            remove.mutate({ id: point.id });
                        }}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.allPoints.length === 0 && (
                <tr>
                  <td
                    className="p-6 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    Ainda não há pontos cadastrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {remove.isError && (
          <p role="alert" className="p-4 text-sm text-[color:var(--danger)]">
            {remove.error.message}
          </p>
        )}
      </section>

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary-dark">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        Aprovação, edição e exclusão são protegidas no servidor por autorização
        de administrador.
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      {hint && (
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
