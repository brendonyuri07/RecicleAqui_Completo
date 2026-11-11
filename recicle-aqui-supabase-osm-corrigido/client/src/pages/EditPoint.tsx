import { ArrowLeft, MapPin, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import AppShell, { RequireSession } from "@/components/AppShell";
import ImageUpload from "@/components/ImageUpload";
import QueryError from "@/components/QueryError";
import { MATERIALS, type Material, type PointStatus } from "@/lib/domain";
import { trpc } from "@/lib/trpc";

const emptyForm = {
  name: "",
  neighborhood: "",
  address: "",
  openingHours: "",
  description: "",
  estimatedVolume: "",
  photoUrl: "",
  latitude: "",
  longitude: "",
  capacityStatus: "ativo" as PointStatus,
};

export default function EditPoint() {
  return (
    <AppShell>
      <RequireSession adminOnly>
        <EditPointForm />
      </RequireSession>
    </AppShell>
  );
}

function EditPointForm() {
  const [, params] = useRoute("/admin/pontos/:id/editar");
  const pointId = Number(params?.id);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const point = trpc.points.byId.useQuery(
    { id: pointId },
    { enabled: Number.isInteger(pointId) && pointId > 0 }
  );
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Material[]>([]);
  const update = trpc.points.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.overview.invalidate(),
        utils.points.list.invalidate(),
        utils.points.byId.invalidate({ id: pointId }),
        utils.public.stats.invalidate(),
        utils.dashboard.mine.invalidate(),
      ]);
      navigate("/admin");
    },
  });

  useEffect(() => {
    if (!point.data) return;
    setForm({
      name: point.data.name,
      neighborhood: point.data.neighborhood,
      address: point.data.address,
      openingHours: point.data.openingHours,
      description: point.data.description,
      estimatedVolume: point.data.estimatedVolume,
      photoUrl: point.data.photoUrl ?? "",
      latitude: String(point.data.latitude),
      longitude: String(point.data.longitude),
      capacityStatus: point.data.capacityStatus,
    });
    setSelected(point.data.materials);
  }, [point.data]);

  const set = (field: keyof typeof form, value: string) =>
    setForm(current => ({ ...current, [field]: value }));
  const toggle = (material: Material) =>
    setSelected(current =>
      current.includes(material)
        ? current.filter(item => item !== material)
        : [...current, material]
    );
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    update.mutate({
      id: pointId,
      name: form.name,
      neighborhood: form.neighborhood,
      address: form.address,
      openingHours: form.openingHours,
      description: form.description,
      estimatedVolume: form.estimatedVolume || "Não informado",
      photoUrl: form.photoUrl || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      capacityStatus: form.capacityStatus,
      materials: selected,
    });
  };

  if (!Number.isInteger(pointId) || pointId <= 0)
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-xl font-semibold">Ponto não encontrado.</h1>
        <Link href="/admin" className="btn-outline mt-4">
          Voltar à administração
        </Link>
      </div>
    );
  if (point.isLoading)
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  if (point.isError)
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <QueryError
          title="Não foi possível carregar o ponto"
          retry={() => void point.refetch()}
        />
      </div>
    );
  if (!point.data)
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-xl font-semibold">Ponto não encontrado.</h1>
        <Link href="/admin" className="btn-outline mt-4">
          Voltar à administração
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à administração
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Editar ponto de coleta</h1>
      <p className="mt-1 text-sm text-muted-foreground">{point.data.name}</p>
      <form onSubmit={submit} className="card-soft mt-6 space-y-5 p-6">
        <Field
          label="Nome do ponto"
          value={form.name}
          onChange={v => set("name", v)}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Bairro"
            value={form.neighborhood}
            onChange={v => set("neighborhood", v)}
            required
          />
          <Field
            label="Horário de coleta"
            value={form.openingHours}
            onChange={v => set("openingHours", v)}
            required
          />
        </div>
        <Field
          label="Endereço"
          value={form.address}
          onChange={v => set("address", v)}
          required
        />
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Descrição
          </span>
          <textarea
            value={form.description}
            onChange={event => set("description", event.target.value)}
            rows={3}
            required
            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Volume estimado"
            value={form.estimatedVolume}
            onChange={v => set("estimatedVolume", v)}
          />
          <Field
            label="URL da foto (opcional)"
            type="url"
            value={form.photoUrl}
            onChange={v => set("photoUrl", v)}
          />
        </div>
        <ImageUpload
          label="Atualizar foto do ponto"
          purpose="point"
          value={form.photoUrl}
          onChange={value => set("photoUrl", value)}
        />
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Localização do ponto
          </span>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field
              label="Latitude"
              type="number"
              step="0.000001"
              value={form.latitude}
              onChange={v => set("latitude", v)}
              required
            />
            <Field
              label="Longitude"
              type="number"
              step="0.000001"
              value={form.longitude}
              onChange={v => set("longitude", v)}
              required
            />
          </div>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Status de capacidade
          </span>
          <select
            value={form.capacityStatus}
            onChange={event => set("capacityStatus", event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="ativo">Ativo</option>
            <option value="proximo">Próximo da capacidade</option>
            <option value="lotado">Lotado</option>
          </select>
        </label>
        <fieldset>
          <legend className="text-xs font-medium text-muted-foreground">
            Materiais aceitos
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {MATERIALS.map(material => (
              <button
                key={material}
                type="button"
                onClick={() => toggle(material)}
                aria-pressed={selected.includes(material)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${selected.includes(material) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
              >
                {material}
              </button>
            ))}
          </div>
        </fieldset>
        {selected.length === 0 && (
          <p className="text-sm text-[color:var(--danger)]">
            Selecione ao menos um material aceito.
          </p>
        )}
        {update.isError && (
          <p
            role="alert"
            className="rounded-lg bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]"
          >
            {update.error.message}
          </p>
        )}
        <button
          type="submit"
          className="btn-primary"
          disabled={update.isPending || selected.length === 0}
        >
          <Save className="h-4 w-4" />
          {update.isPending ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={event => onChange(event.target.value)}
        required={required}
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}
