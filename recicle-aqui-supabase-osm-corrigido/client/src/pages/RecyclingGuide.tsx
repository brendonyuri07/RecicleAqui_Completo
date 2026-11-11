import {
  CheckCircle2,
  Droplets,
  Leaf,
  Package,
  Recycle,
  Truck,
} from "lucide-react";
import { Link } from "wouter";
import AppShell from "@/components/AppShell";

const steps = [
  {
    number: "01",
    icon: Package,
    title: "Separe por material",
    description:
      "Separe papel, plástico, vidro, metal e eletrônicos. Confira no mapa quais materiais cada ponto de coleta recebe.",
  },
  {
    number: "02",
    icon: Droplets,
    title: "Esvazie e limpe",
    description:
      "Retire restos de alimentos e líquidos das embalagens. Uma lavagem rápida, quando necessária, evita mau cheiro e contaminação dos recicláveis.",
  },
  {
    number: "03",
    icon: Recycle,
    title: "Prepare cada tipo",
    description:
      "Achate caixas e garrafas para ocupar menos espaço. Mantenha vidros separados e protegidos; não misture cacos soltos com outros materiais.",
  },
  {
    number: "04",
    icon: Leaf,
    title: "Armazene com cuidado",
    description:
      "Guarde os materiais limpos e secos em local coberto, usando sacos ou caixas identificados. Mantenha-os longe de crianças e animais.",
  },
  {
    number: "05",
    icon: Truck,
    title: "Confirme e entregue",
    description:
      "Consulte endereço, horário e materiais aceitos pelo ponto antes de sair. Entregue os itens separados e siga as orientações da equipe local.",
  },
];

export default function RecyclingGuide() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="card-soft overflow-hidden p-7 sm:p-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-dark">
            <Leaf className="h-5 w-5" />
            Guia do doador
          </div>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Como reciclar</h1>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            Pequenos cuidados em casa ajudam os materiais a chegar em boas
            condições a quem faz a triagem e a reciclagem. Siga este passo a
            passo para preparar sua doação.
          </p>
        </header>

        <ol className="mt-6 space-y-4">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <li
                key={step.number}
                className="card-soft flex gap-4 p-5 sm:gap-6 sm:p-6"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-bold tracking-widest text-primary">
                    PASSO {step.number}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <section className="card-soft mt-6 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              Por que separar corretamente?
            </h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A separação e a limpeza reduzem a contaminação dos recicláveis e
            facilitam o trabalho de catadores e cooperativas. Quando destinados
            corretamente, papel, plástico, vidro e metal podem voltar à cadeia
            produtiva, economizando matérias-primas e reduzindo resíduos
            enviados a aterros. Pilhas, lâmpadas e eletrônicos exigem pontos
            especializados: não os descarte no lixo comum nem os entregue em
            locais que não os aceitam.
          </p>
          <Link href="/mapa" className="btn-primary mt-5">
            <Truck className="h-4 w-4" />
            Encontrar um ponto de coleta
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
