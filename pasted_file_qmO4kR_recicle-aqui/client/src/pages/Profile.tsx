import { Camera, Mail, Phone, Save, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell, { RequireSession, useCommunitySession } from "@/components/AppShell";
import type { CommunityRole } from "@/lib/domain";
import { trpc } from "@/lib/trpc";

export default function Profile() { return <AppShell><RequireSession><ProfileForm /></RequireSession></AppShell>; }

function ProfileForm() {
  const session = useCommunitySession();
  const utils = trpc.useUtils();
  const profile = session.profile.data;
  const [form, setForm] = useState({ name: "", phone: "", communityRole: "Doador" as CommunityRole });
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (profile) setForm({ name: profile.name ?? "", phone: profile.phone ?? "", communityRole: profile.communityRole }); }, [profile]);
  const update = trpc.profile.update.useMutation({ onSuccess: () => { utils.profile.me.invalidate(); setSaved(true); window.setTimeout(() => setSaved(false), 2500); } });
  const submit = (event: React.FormEvent) => { event.preventDefault(); update.mutate(form); };
  if (!profile) return <div className="mx-auto max-w-4xl px-6 py-10"><div className="h-72 animate-pulse rounded-2xl bg-muted" /></div>;
  return <div className="mx-auto max-w-4xl px-6 py-10"><h1 className="text-3xl font-bold">Meu perfil</h1><p className="mt-1 text-sm text-muted-foreground">Gerencie suas informações pessoais e o papel com que participa da comunidade.</p><div className="mt-8 grid gap-6 md:grid-cols-[260px_1fr]"><aside className="card-soft p-6 text-center"><div className="relative mx-auto grid h-28 w-28 place-items-center rounded-full bg-primary/15 text-3xl font-extrabold text-primary-dark">{profile.name?.[0]?.toUpperCase() ?? "R"}<span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-md"><Camera className="h-4 w-4" /></span></div><div className="mt-4 font-semibold">{profile.name}</div><div className="text-xs text-muted-foreground">{profile.email}</div><span className="mt-3 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary-dark">{profile.communityRole}</span></aside><form onSubmit={submit} className="card-soft space-y-5 p-6"><InputRow icon={UserIcon} label="Nome completo" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><InputRow icon={Mail} label="E-mail" value={profile.email ?? ""} disabled /><InputRow icon={Phone} label="Telefone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} /><div><span className="text-xs font-medium text-muted-foreground">Participação na comunidade</span><div className="mt-2 grid grid-cols-2 gap-3">{(["Doador", "Catador"] as CommunityRole[]).map((role) => <button type="button" key={role} onClick={() => setForm({ ...form, communityRole: role })} className={`rounded-xl border p-3 text-sm font-medium transition ${form.communityRole === role ? "border-primary bg-primary/5 text-primary-dark" : "border-border hover:bg-muted"}`}>{role}</button>)}</div><p className="mt-2 text-xs text-muted-foreground">A função controla somente a identificação exibida nos chats; as permissões administrativas são separadas.</p></div>{update.isError && <p className="rounded-lg bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">{update.error.message}</p>}<div className="flex items-center gap-3"><button className="btn-primary" disabled={update.isPending}><Save className="h-4 w-4" /> {update.isPending ? "Salvando…" : "Salvar alterações"}</button>{saved && <span className="text-sm text-[color:var(--success)]">Perfil atualizado!</span>}</div></form></div></div>;
}

function InputRow({ icon: Icon, label, value, onChange, disabled = false }: { icon: typeof UserIcon; label: string; value: string; onChange?: (value: string) => void; disabled?: boolean }) { return <label className="block"><span className="text-xs font-medium text-muted-foreground">{label}</span><div className="mt-1.5 flex items-center gap-2 rounded-lg border border-input bg-background px-3"><Icon className="h-4 w-4 text-muted-foreground" /><input value={value} onChange={(event) => onChange?.(event.target.value)} disabled={disabled} className="flex-1 bg-transparent py-2.5 text-sm outline-none disabled:opacity-60" /></div></label>; }
