import {
  ArrowRight,
  HandHeart,
  Leaf,
  MapPin,
  MessageCircle,
  Recycle,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import AppShell from "@/components/AppShell";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const stats = trpc.public.stats.useQuery();
  const values = stats.data ?? { activePoints: 0, points: 0, users: 0 };

  return (
    <AppShell>
      <section className="gradient-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary-dark">
              <Leaf className="h-3.5 w-3.5" /> Sustentabilidade em
              Taquaritinga-SP
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
              Descarte certo,
              <br />
              <span className="text-primary-dark">cidade mais verde.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Recicle Aqui conecta moradores e catadores através de pontos de
              coleta inteligentes, facilitando o descarte correto de materiais
              recicláveis e contribuindo para uma cidade mais sustentável.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => startLogin(true)}>
                <HandHeart className="h-4 w-4" /> Quero reciclar
              </button>
              <button className="btn-primary" onClick={() => startLogin()}>
                <Truck className="h-4 w-4" /> Sou Catador
              </button>
              <Link href="/pontos" className="btn-outline">
                Ver pontos
              </Link>
            </div>
            {stats.isError && (
              <p role="status" className="mt-6 text-sm text-muted-foreground">
                Estatísticas temporariamente indisponíveis.
              </p>
            )}
            <div className="mt-10 grid max-w-md grid-cols-3 gap-6">
              <Stat
                value={!stats.data ? "—" : String(values.activePoints)}
                label="Pontos ativos"
              />
              <Stat
                value={!stats.data ? "—" : String(values.points)}
                label="Pontos verificados"
              />
              <Stat
                value={!stats.data ? "—" : String(values.users)}
                label="Usuários"
              />
            </div>
          </div>
          <div className="relative">
            <div className="card-soft rotate-[-1deg] p-6">
              <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-light to-primary/30">
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(255,255,255,.6), transparent 40%)",
                  }}
                />
                <Recycle
                  className="h-40 w-40 text-primary-dark/80"
                  strokeWidth={1.2}
                />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { c: "var(--success)", t: "Ativo" },
                  { c: "var(--warning)", t: "Próximo" },
                  { c: "var(--danger)", t: "Lotado" },
                ].map(item => (
                  <div
                    key={item.t}
                    className="flex items-center gap-2 rounded-lg bg-muted/60 p-3"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: item.c }}
                    />
                    <span className="text-xs font-medium">{item.t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-soft absolute -bottom-6 -left-6 hidden w-56 items-center gap-3 p-4 sm:flex">
              <MapPin className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">
                  Próximo a você
                </div>
                <div className="text-sm font-semibold">
                  Pontos da comunidade
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Por que usar o Recicle Aqui?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Uma plataforma feita para incentivar a reciclagem e fortalecer a
            comunidade local.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: MapPin,
              title: "Pontos próximos",
              description:
                "Encontre o ponto de coleta mais próximo de você com um mapa interativo.",
            },
            {
              icon: MessageCircle,
              title: "Chat comunitário",
              description:
                "Comunique-se com catadores e vizinhos em cada ponto de coleta.",
            },
            {
              icon: ShieldCheck,
              title: "Confiável",
              description:
                "Pontos verificados, status em tempo real e moderação ativa.",
            },
            {
              icon: Users,
              title: "Comunidade",
              description:
                "Conecte-se a catadores locais e fortaleça a economia circular.",
            },
            {
              icon: Sparkles,
              title: "Impacto real",
              description:
                "Reduza o lixo enviado ao aterro e contribua com a cidade.",
            },
            {
              icon: Recycle,
              title: "Todos os materiais",
              description:
                "Papel, plástico, vidro, metal e eletrônicos — tudo no lugar certo.",
            },
          ].map(benefit => (
            <div key={benefit.title} className="card-soft p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <benefit.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{benefit.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-secondary/60">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Como funciona</h2>
            <p className="mt-3 text-muted-foreground">
              Em três passos simples você participa da transformação da sua
              cidade.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Entre na plataforma",
                description:
                  "Acesse com sua conta para participar como Doador ou Catador.",
              },
              {
                n: "02",
                title: "Encontre um ponto",
                description:
                  "Use o mapa e filtre materiais para localizar a melhor opção.",
              },
              {
                n: "03",
                title: "Conecte e recicle",
                description:
                  "Converse no chat do ponto e descarte corretamente.",
              },
            ].map(step => (
              <div key={step.n} className="card-soft relative p-6">
                <span className="absolute -top-3 left-6 rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                  {step.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/mapa" className="btn-primary">
              Ver mapa de pontos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-extrabold text-primary-dark">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
