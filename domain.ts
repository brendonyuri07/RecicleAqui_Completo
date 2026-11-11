export const MATERIALS = ["Papel", "Plástico", "Vidro", "Metal", "Eletrônicos"] as const;
export type Material = (typeof MATERIALS)[number];

export type PointStatus = "ativo" | "proximo" | "lotado";
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
