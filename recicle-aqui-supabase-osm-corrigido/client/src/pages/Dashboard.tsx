import {
  Activity,
  ArrowRight,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  PlusCircle,
  User,
} from "lucide-react";
import { Link } from "wouter";
import QueryError from "@/components/QueryError";
import AppShell, {
  RequireSession,
  useCommunitySession,
} from "@/components/AppShell";
import { formatDate } from "@/lib/domain";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  return (
    <AppShell>
      <RequireSession>
        <DashboardContent />
      </RequireSession>
    </AppShell>
  );
}

function DashboardContent() {
  const session = useCommunitySession();
  const dashboard = trpc.dashboard.mine.useQuery(undefined, {
    enabled: session.isAuthenticated,
  });
  const stats = trpc.public.stats.useQuery();
  const profile = session.profile.data;
  const data = dashboard.data;

  if (dashboard.isLoading || session.profile.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (dashboard.isError)
    return (
      <QueryError
        title="Não foi possível carregar seu painel"
        retry={() => void dashboard.refetch()}
      />
    );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Bem-vindo, {profile?.name?.split(" ")[0] ?? "membro"}
          </p>
          <h1 className="mt-1 text-3xl font-bold">Seu painel</h1>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-dark">
          {profile?.communityRole ?? "Doador"}
        </span>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Activity}
          label="Pontos cadastrados"
          value={String(data?.myPointCount ?? 0)}
          hint="em análise ou publicados"
        />
        <Stat
          icon={Package}
          label="Pontos verificados"
          value={stats.data ? String(stats.data.points) : "—"}
          hint="na plataforma"
        />
        <Stat
          icon={MapPin}
          label="Pontos ativos"
          value={stats.data ? String(stats.data.activePoints) : "—"}
          hint="disponíveis agora"
        />
        <Stat
          icon={MessageSquare}
          label="Minhas mensagens"
          value={String(data?.messageCount ?? 0)}
          hint="participações no chat"
        />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card-soft p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Acesso rápido</h2>
            <Link
              href="/mapa"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary-dark"
            >
              Abrir mapa <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <QuickLink href="/mapa" icon={MapPin} title="Mapa de pontos" />
            <QuickLink href="/pontos" icon={Package} title="Lista de pontos" />
            <QuickLink
              href="/pontos/novo"
              icon={PlusCircle}
              title="Cadastrar ponto"
            />
          </div>
          <h3 className="mt-8 font-semibold">Meus pontos cadastrados</h3>
          <div className="mt-3 divide-y divide-border">
            {data?.myPoints.length ? (
              data.myPoints.map(point => (
                <Link
                  key={point.id}
                  href={`/pontos/${point.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-3 transition hover:bg-muted/50"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {point.name}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${point.approvalStatus === "aprovado" ? "bg-primary/10 text-primary-dark" : point.approvalStatus === "pendente" ? "bg-[color:var(--warning)]/10 text-[color:var(--warning)]" : "bg-[color:var(--danger)]/10 text-[color:var(--danger)]"}`}
                      >
                        {point.approvalStatus === "pendente"
                          ? "Em análise"
                          : point.approvalStatus}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {point.neighborhood} · {point.openingHours}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))
            ) : (
              <div className="rounded-lg bg-muted/50 p-5 text-sm text-muted-foreground">
                Você ainda não cadastrou um ponto.{" "}
                <Link
                  href="/pontos/novo"
                  className="font-semibold text-primary-dark underline"
                >
                  Cadastrar agora
                </Link>
              </div>
            )}
          </div>
        </section>
        <aside className="card-soft p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="h-4 w-4" /> Mensagens recentes
          </h2>
          <div className="mt-4 space-y-4">
            {data?.recentMessages.length ? (
              data.recentMessages.map(message => (
                <Link
                  key={message.id}
                  href={`/pontos/${message.pointId}`}
                  className="block rounded-lg p-2 transition hover:bg-muted"
                >
                  <div className="text-sm font-medium">{message.pointName}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {message.content}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {formatDate(message.createdAt)}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Suas participações nos chats aparecerão aqui.
              </p>
            )}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 border-t border-border pt-4">
            <Link href="/perfil" className="btn-outline text-xs">
              <User className="h-4 w-4" /> Perfil
            </Link>
            {profile?.isAdmin === "admin" && (
              <Link href="/admin" className="btn-outline text-xs">
                <LayoutDashboard className="h-4 w-4" /> Admin
              </Link>
            )}
          </div>
        </aside>
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
  icon: typeof Activity;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
}: {
  href: string;
  icon: typeof Activity;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border p-4 transition hover:bg-muted"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );
}
