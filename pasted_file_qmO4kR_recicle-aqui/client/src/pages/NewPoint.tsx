import { CheckCircle2, MapPin, Save } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import AppShell, { RequireSession } from "@/components/AppShell";
import { MATERIALS, type Material } from "@/lib/domain";
import { trpc } from "@/lib/trpc";

const initialForm = { name: "", neighborhood: "", address: "", openingHours: "", description: "", estimatedVolume: "", photoUrl: "", latitude: "-21.406", longitude: "-48.505" };

export default function NewPoint() {
  return <AppShell><RequireSession><NewPointForm /></RequireSession></AppShell>;
}

function NewPointForm() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [form, setForm] = useState(initialForm);
  const [selected, setSelected] = useState<Material[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const create = trpc.points.create.useMutation({
    onSuccess: () => { utils.points.list.invalidate(); utils.dashboard.mine.invalidate(); setSubmitted(true); },
  });
  const set = (field: keyof typeof initialForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const toggle = (material: Material) => setSelected((current) => current.includes(material) ? current.filter((item) => item !== material) : [...current, material]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate({
      name: form.name,
      neighborhood: form.neighborhood,
      address: form.address,
      openingHours: form.openingHours,
      description: form.description,
      estimatedVolume: form.estimatedVolume || undefined,
      photoUrl: form.photoUrl || undefined,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      materials: selected,
    });
  };

  if (submitted) return <div className="mx-auto max-w-3xl px-6 py-10"><div className="card-soft p-8 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-primary" /><h1 className="mt-3 text-xl font-bold">Solicitação enviada!</h1><p className="mt-1 text-sm text-muted-foreground">Seu ponto foi salvo e ficará aguardando aprovação administrativa antes de aparecer no mapa público.</p><div className="mt-6 flex justify-center gap-2"><button className="btn-primary" onClick={() => setLocation("/dashboard")}>Ir para o painel</button><button className="btn-outline" onClick={() => setLocation("/pontos")}>Ver pontos</button></div></div></div>;

  return <div className="mx-auto max-w-3xl px-6 py-10"><h1 className="text-3xl font-bold">Cadastrar novo ponto</h1><p className="mt-1 text-sm text-muted-foreground">Depois do envio, a equipe administrativa revisará seu cadastro.</p><form onSubmit={submit} className="card-soft mt-6 space-y-5 p-6"><Field label="Nome do ponto" value={form.name} onChange={(value) => set("name", value)} required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Bairro" value={form.neighborhood} onChange={(value) => set("neighborhood", value)} required /><Field label="Horário de coleta" placeholder="Seg–Sex · 08h–17h" value={form.openingHours} onChange={(value) => set("openingHours", value)} required /></div><Field label="Endereço" value={form.address} onChange={(value) => set("address", value)} required /><label className="block"><span className="text-xs font-medium text-muted-foreground">Descrição</span><textarea value={form.description} onChange={(event) => set("description", event.target.value)} rows={3} required className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label><div className="grid gap-4 sm:grid-cols-2"><Field label="Volume estimado (opcional)" placeholder="Ex.: ~100 kg/semana" value={form.estimatedVolume} onChange={(value) => set("estimatedVolume", value)} /><Field label="URL da foto (opcional)" type="url" placeholder="https://..." value={form.photoUrl} onChange={(value) => set("photoUrl", value)} /></div><div className="rounded-xl border border-border bg-muted/40 p-4"><span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Localização do ponto</span><p className="mt-1 text-xs text-muted-foreground">Os valores já começam no centro de Taquaritinga-SP; ajuste para posicionar seu ponto no mapa.</p><div className="mt-3 grid grid-cols-2 gap-3"><Field label="Latitude" type="number" step="0.000001" value={form.latitude} onChange={(value) => set("latitude", value)} required /><Field label="Longitude" type="number" step="0.000001" value={form.longitude} onChange={(value) => set("longitude", value)} required /></div></div><div><span className="text-xs font-medium text-muted-foreground">Materiais aceitos</span><div className="mt-2 flex flex-wrap gap-2">{MATERIALS.map((material) => <button key={material} type="button" onClick={() => toggle(material)} className={`rounded-full border px-3 py-1.5 text-xs transition ${selected.includes(material) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>{material}</button>)}</div></div>{create.isError && <p className="rounded-lg bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">{create.error.message}</p>}<div className="flex gap-2 pt-2"><button type="submit" className="btn-primary" disabled={create.isPending}><Save className="h-4 w-4" /> {create.isPending ? "Enviando…" : "Enviar para aprovação"}</button><button type="button" className="btn-outline" onClick={() => setLocation("/pontos")}>Cancelar</button></div></form></div>;
}

function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void; [key: string]: unknown }) { return <label className="block"><span className="text-xs font-medium text-muted-foreground">{label}</span><input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label>; }
