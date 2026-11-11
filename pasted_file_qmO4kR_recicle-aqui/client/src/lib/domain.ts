export const MATERIALS = ["Papel", "Plástico", "Vidro", "Metal", "Eletrônicos"] as const;
export type Material = (typeof MATERIALS)[number];

export type PointStatus = "ativo" | "proximo" | "lotado";
export type QuickPointStatus = "disponivel" | "lotado" | "fechado";
export type ApprovalStatus = "pendente" | "aprovado" | "recusado";
export type CommunityRole = "Doador" | "Catador";

export interface CollectionPoint {
  id: number;
  ownerId: number;
  name: string;
  neighborhood: string;
  address: string;
  openingHours: string;
  description: string;
  estimatedVolume: string;
  photoUrl: string | null;
  latitude: number;
  longitude: number;
  capacityStatus: PointStatus;
  approvalStatus: ApprovalStatus;
  materials: Material[];
  createdAt: Date;
  updatedAt: Date;
}

export const statusLabel: Record<PointStatus, string> = {
  ativo: "Ativo",
  proximo: "Próximo da capacidade",
  lotado: "Lotado",
};

export const quickStatusLabel: Record<QuickPointStatus, string> = {
  disponivel: "Disponível",
  lotado: "Lotado",
  fechado: "Fechado",
};

export function directionsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

export function getQuickPointStatus(
  capacityStatus: PointStatus,
  openingHours: string,
  now = new Date()
): QuickPointStatus {
  if (!scheduleIsOpen(openingHours, now)) return "fechado";
  return capacityStatus === "lotado" ? "lotado" : "disponivel";
}

function scheduleIsOpen(openingHours: string, now: Date) {
  const normalized = openingHours
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .toLowerCase();
  const times = Array.from(
    normalized.matchAll(/\b(\d{1,2})(?:h([0-5]\d)?|:([0-5]\d))\b/g),
    match => Number(match[1]) * 60 + Number(match[2] ?? match[3] ?? 0)
  );
  if (times.length < 2) return true;
  if (!scheduleIncludesToday(normalized, now.getDay())) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (let index = 0; index + 1 < times.length; index += 2) {
    if (currentMinutes >= times[index] && currentMinutes < times[index + 1]) {
      return true;
    }
  }
  return false;
}

function scheduleIncludesToday(schedule: string, day: number) {
  const days = [
    [1, /\b(?:segunda-feira|segunda|seg)\b/g],
    [2, /\b(?:terca-feira|terca|ter)\b/g],
    [3, /\b(?:quarta-feira|quarta|qua)\b/g],
    [4, /\b(?:quinta-feira|quinta|qui)\b/g],
    [5, /\b(?:sexta-feira|sexta|sex)\b/g],
    [6, /\b(?:sabado|sab)\b/g],
    [0, /\b(?:domingo|dom)\b/g],
  ] as const;
  const matches = days.flatMap(([index, pattern]) =>
    Array.from(schedule.matchAll(pattern), match => ({ day: index, index: match.index ?? 0, end: (match.index ?? 0) + match[0].length }))
  ).sort((left, right) => left.index - right.index);

  if (matches.length === 0) return true;
  if (matches.length === 2) {
    const separator = schedule.slice(matches[0].end, matches[1].index).trim();
    if (/^(?:-|a|ate)$/.test(separator)) {
      let current = matches[0].day;
      while (true) {
        if (current === day) return true;
        if (current === matches[1].day) return false;
        current = (current + 1) % 7;
      }
    }
  }
  return matches.some(match => match.day === day);
}

export const approvalLabel: Record<ApprovalStatus, string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export function pointImage(point: Pick<CollectionPoint, "photoUrl" | "name">) {
  if (point.photoUrl) return point.photoUrl;
  const seed = encodeURIComponent(point.name);
  return `https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80&sig=${seed.length}`;
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
