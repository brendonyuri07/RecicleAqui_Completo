import {
  Leaf,
  LogIn,
  LogOut,
  MapPinned,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import QueryError from "./QueryError";

export function useCommunitySession() {
  const auth = useAuth();
  const profile = trpc.profile.me.useQuery(undefined, {
    enabled: auth.isAuthenticated,
  });
  return { ...auth, profile };
}

export function RequireSession({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const session = useCommunitySession();
  if (
    session.loading ||
    (session.isAuthenticated && session.profile.isLoading)
  ) {
    return (
      <div
        role="status"
        className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground"
      >
        Carregando sua conta…
      </div>
    );
  }
  if (session.error)
    return (
      <QueryError
        title="Não foi possível acessar sua conta"
        retry={() => void session.refresh()}
      />
    );
  if (!session.isAuthenticated)
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <LogIn className="h-9 w-9 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Entre para continuar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Acesse sua conta para participar da comunidade Recicle Aqui.
        </p>
        <Link href="/entrar" className="btn-primary mt-6">
          Entrar com e-mail
        </Link>
        <Link href="/" className="mt-3 text-sm text-primary underline">
          Voltar ao início
        </Link>
      </div>
    );
  if (session.profile.isError)
    return (
      <QueryError
        title="Não foi possível carregar seu perfil"
        retry={() => void session.profile.refetch()}
      />
    );
  if (adminOnly && session.profile.data?.isAdmin !== "admin")
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <ShieldCheck className="h-9 w-9 text-danger" />
        <h1 className="mt-4 text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é destinada à administração da plataforma.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6">
          Ir para meu painel
        </Link>
      </div>
    );
  return <>{children}</>;
}

export default function AppShell({
  children,
  hideFooter = false,
}: {
  children: ReactNode;
  hideFooter?: boolean;
}) {
  const [location, navigate] = useLocation();
  const session = useCommunitySession();
  const profile = session.profile.data;
  const nav = [
    { href: "/", label: "Início" },
    { href: "/mapa", label: "Mapa" },
    { href: "/pontos", label: "Pontos" },
    { href: "/como-reciclar", label: "Como reciclar" },
    { href: "/instalar", label: "Instalar app" },
    ...(session.isAuthenticated
      ? [
          { href: "/dashboard", label: "Painel" },
          { href: "/perfil", label: "Perfil" },
        ]
      : []),
    ...(profile?.isAdmin === "admin"
      ? [{ href: "/admin", label: "Admin" }]
      : []),
  ];
  const links = nav.map(item => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={location === item.href ? "page" : undefined}
      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${location === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      {item.label}
    </Link>
  ));
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <header className="app-header sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-lg font-semibold"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="font-display">
              Recicle <span className="text-primary">Aqui</span>
            </span>
          </Link>
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-1 lg:flex"
          >
            {links}
          </nav>
          <div className="flex items-center gap-2">
            {session.loading ? (
              <span className="text-xs text-muted-foreground">Carregando…</span>
            ) : session.isAuthenticated ? (
              <>
                <Link
                  href="/perfil"
                  className="btn-outline hidden items-center gap-2 sm:inline-flex"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-[10px]">
                      {profile?.name?.[0]?.toUpperCase() ?? "R"}
                    </AvatarFallback>
                  </Avatar>
                  {profile?.name?.split(" ")[0] ?? "Perfil"}
                </Link>
                <button
                  className="btn-outline"
                  aria-label="Sair da conta"
                  onClick={() =>
                    void session
                      .logout()
                      .then(() => navigate("/"))
                      .catch(() => {})
                  }
                  disabled={session.loggingOut}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/entrar"
                  className="btn-outline"
                  aria-label="Entrar"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Entrar</span>
                </Link>
                <Link
                  href="/cadastro"
                  className="btn-primary hidden sm:inline-flex"
                >
                  <UserPlus className="h-4 w-4" />
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
        <nav
          aria-label="Navegação para celular"
          className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 lg:hidden"
        >
          {links}
        </nav>
        {session.error && (
          <p role="alert" className="px-4 py-2 text-center text-sm text-danger">
            Não foi possível atualizar sua sessão. Tente novamente.
          </p>
        )}
      </header>
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      {!hideFooter && (
        <footer className="border-t border-border bg-card text-foreground">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold">Recicle Aqui</span>
            <span className="text-muted-foreground">
              Conectando Taquaritinga-SP a um futuro mais sustentável.
            </span>
            <Link
              href="/pontos"
              className="inline-flex items-center gap-1 text-primary"
            >
              <MapPinned className="h-4 w-4" />
              Encontrar pontos
            </Link>
            <Link href="/como-reciclar" className="text-primary">
              Como reciclar
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}
