import { Leaf, LayoutDashboard, LogIn, LogOut, MapPinned, ShieldCheck, User, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export function useCommunitySession() {
  const auth = useAuth();
  const profile = trpc.profile.me.useQuery(undefined, { enabled: auth.isAuthenticated });
  return { ...auth, profile };
}

export function RequireSession({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const [location, setLocation] = useLocation();
  const session = useCommunitySession();

  if (session.loading || (session.isAuthenticated && session.profile.isLoading)) {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Carregando sua conta…</div>;
  }

  if (!session.isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <LogIn className="h-9 w-9 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Entre para continuar</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesse sua conta para participar da comunidade Recicle Aqui.</p>
        <button className="btn-primary mt-6" onClick={() => startLogin()}>Entrar com Manus</button>
        <button className="mt-3 text-sm text-primary-dark underline" onClick={() => setLocation("/")}>Voltar ao início</button>
      </div>
    );
  }

  if (adminOnly && session.profile.data?.isAdmin !== "admin") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <ShieldCheck className="h-9 w-9 text-[color:var(--danger)]" />
        <h1 className="mt-4 text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta área é destinada apenas à administração da plataforma.</p>
        <button className="btn-primary mt-6" onClick={() => setLocation("/dashboard")}>Ir para meu painel</button>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AppShell({ children, hideFooter = false }: { children: ReactNode; hideFooter?: boolean }) {
  const [location, setLocation] = useLocation();
  const session = useCommunitySession();
  const currentUser = session.profile.data;
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      session.logout();
      setLocation("/");
    },
  });

  const nav = [
    { href: "/", label: "Início" },
    { href: "/mapa", label: "Mapa" },
    { href: "/pontos", label: "Pontos" },
    ...(session.isAuthenticated ? [{ href: "/dashboard", label: "Painel" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Leaf className="h-5 w-5" /></span>
            <span className="font-display">Recicle <span className="text-primary">Aqui</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => <Link key={item.href} href={item.href} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${location === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            {session.loading ? <span className="text-xs text-muted-foreground">Carregando…</span> : session.isAuthenticated ? (
              <>
                <Link href="/perfil" className="btn-outline hidden sm:inline-flex"><User className="h-4 w-4" /> {currentUser?.name?.split(" ")[0] ?? "Perfil"}</Link>
                {currentUser?.isAdmin === "admin" && <Link href="/admin" className="btn-outline hidden lg:inline-flex"><ShieldCheck className="h-4 w-4" /> Admin</Link>}
                <button className="btn-outline" onClick={() => logout.mutate()} disabled={logout.isPending}><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sair</span></button>
              </>
            ) : (
              <>
                <button className="btn-outline" onClick={() => startLogin()}><LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Entrar</span></button>
                <button className="btn-primary hidden sm:inline-flex" onClick={() => startLogin()}><UserPlus className="h-4 w-4" /> Criar conta</button>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
          {nav.map((item) => <Link key={item.href} href={item.href} className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${location === item.href ? "bg-accent" : "text-muted-foreground"}`}>{item.label}</Link>)}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      {!hideFooter && <footer className="border-t border-border bg-[color:var(--primary-dark)] text-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold">Recicle Aqui</span><span className="text-white/70">Conectando Taquaritinga-SP a um futuro mais sustentável.</span><Link href="/pontos" className="inline-flex items-center gap-1 text-white/90 hover:text-white"><MapPinned className="h-4 w-4" /> Encontrar pontos</Link></div></footer>}
    </div>
  );
}
