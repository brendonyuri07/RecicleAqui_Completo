import { ENV } from "./_core/env";
import { getSupabase } from "./supabase";
import {
  activityTypes,
  approvalStatuses,
  communityRoles,
  materials,
  pointStatuses,
  type CommunityRole,
  type Material,
  type PointStatus,
} from "../drizzle/schema";
import type { InsertUser } from "../drizzle/schema";

const supabase = () => getSupabase();

type PointRecord = {
  id: number;
  owner_id: number;
  name: string;
  neighborhood: string;
  address: string;
  opening_hours: string;
  description: string;
  estimated_volume: string;
  photo_url: string | null;
  latitude: number | string;
  longitude: number | string;
  capacity_status: PointStatus;
  approval_status: (typeof approvalStatuses)[number];
  approved_by_id: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

type PointView = {
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
  approvalStatus: (typeof approvalStatuses)[number];
  approvedById: number | null;
  approvedAt: Date | null;
  materials: Material[];
  createdAt: Date;
  updatedAt: Date;
};

function requireConfigured() {
  if (!ENV.supabaseUrl || !ENV.supabaseServerKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para conectar o banco.");
  }
  return supabase();
}

function toPoint(row: PointRecord, pointMaterials: Array<{ material: Material }>): PointView {
  return {
    id: row.id,
    name: row.name,
    neighborhood: row.neighborhood,
    address: row.address,
    description: row.description,
    materials: pointMaterials.map(({ material }) => material),
    ownerId: row.owner_id,
    openingHours: row.opening_hours,
    estimatedVolume: row.estimated_volume,
    photoUrl: row.photo_url,
    capacityStatus: row.capacity_status,
    approvalStatus: row.approval_status,
    approvedById: row.approved_by_id,
    approvedAt: row.approved_at ? new Date(row.approved_at) : null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function withMaterials(rows: PointRecord[]) {
  if (rows.length === 0) return [] as PointView[];
  const db = requireConfigured();
  const { data, error } = await db.from("point_materials").select("point_id, material").in("point_id", rows.map((row) => row.id));
  if (error) throw error;
  const byPoint = new Map<number, Array<{ material: Material }>>();
  for (const item of data ?? []) {
    const list = byPoint.get(item.point_id) ?? [];
    list.push({ material: item.material as Material });
    byPoint.set(item.point_id, list);
  }
  return rows.map((row) => toPoint(row, byPoint.get(row.id) ?? []));
}

async function fetchPoints(filters: Record<string, unknown> = {}) {
  const db = requireConfigured();
  let query = db.from("collection_points").select("*").order("name");
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { data, error } = await query;
  if (error) throw error;
  return withMaterials((data ?? []) as PointRecord[]);
}

export async function getDb() {
  return isSupabaseConfigured() ? supabase() : null;
}

export function isSupabaseConfigured() {
  return Boolean(ENV.supabaseUrl && ENV.supabaseServerKey);
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  if (!isSupabaseConfigured()) return;
  const db = supabase();
  const payload = {
    open_id: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    login_method: user.loginMethod ?? null,
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    last_signed_in: (user.lastSignedIn ?? new Date()).toISOString(),
  };
  const { error } = await db.from("users").upsert(payload, { onConflict: "open_id" });
  if (error) throw error;
}

export async function getUserByOpenId(openId: string) {
  const db = requireConfigured();
  const { data, error } = await db.from("users").select("*").eq("open_id", openId).maybeSingle();
  if (error) throw error;
  return data ? { ...data, openId: data.open_id, loginMethod: data.login_method, communityRole: data.community_role } : undefined;
}

export async function getCommunityProfile(userId: number) {
  const db = requireConfigured();
  const { data, error } = await db.from("users").select("id, name, email, phone, community_role, role, created_at").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data && { id: data.id, name: data.name, email: data.email, phone: data.phone, communityRole: data.community_role, isAdmin: data.role, createdAt: new Date(data.created_at) };
}

export async function updateCommunityProfile(userId: number, input: { name: string; phone?: string | null; communityRole: CommunityRole }) {
  const db = requireConfigured();
  const { error } = await db.from("users").update({ name: input.name, phone: input.phone || null, community_role: input.communityRole }).eq("id", userId);
  if (error) throw error;
  await logActivity({ actorId: userId, type: "profile_updated", description: "Perfil atualizado" });
  return getCommunityProfile(userId);
}

export async function listPublicPoints(input?: { search?: string; materials?: Material[] }) {
  const points = await fetchPoints({ approval_status: "aprovado" });
  const search = input?.search?.trim().toLowerCase();
  const filtered = search ? points.filter((point) => [point.name, point.neighborhood, point.address].some((value) => value.toLowerCase().includes(search))) : points;
  const requested = input?.materials ?? [];
  return requested.length ? filtered.filter((point) => requested.every((material) => point.materials.includes(material))) : filtered;
}

export async function getPointById(pointId: number, includeUnapproved = false) {
  const db = requireConfigured();
  let query = db.from("collection_points").select("*").eq("id", pointId);
  if (!includeUnapproved) query = query.eq("approval_status", "aprovado");
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? (await withMaterials([data as PointRecord]))[0] : undefined;
}

export async function listPointsForOwner(ownerId: number) { return fetchPoints({ owner_id: ownerId }); }

export async function createCollectionPoint(ownerId: number, input: { name: string; neighborhood: string; address: string; openingHours: string; description: string; estimatedVolume?: string; photoUrl?: string; latitude: number; longitude: number; materials: Material[] }) {
  const db = requireConfigured();
  const { data, error } = await db.from("collection_points").insert({ owner_id: ownerId, name: input.name, neighborhood: input.neighborhood, address: input.address, opening_hours: input.openingHours, description: input.description, estimated_volume: input.estimatedVolume || "Não informado", photo_url: input.photoUrl || null, latitude: input.latitude, longitude: input.longitude, approval_status: "pendente", capacity_status: "ativo" }).select().single();
  if (error) throw error;
  const { error: materialError } = await db.from("point_materials").insert(input.materials.map((material) => ({ point_id: data.id, material })));
  if (materialError) throw materialError;
  await logActivity({ actorId: ownerId, pointId: data.id, type: "point_created", description: `Novo ponto cadastrado: ${input.name}` });
  return getPointById(data.id, true);
}

export async function updateCollectionPoint(pointId: number, input: Partial<{ name: string; neighborhood: string; address: string; openingHours: string; description: string; estimatedVolume: string; photoUrl: string | null; latitude: number; longitude: number; capacityStatus: PointStatus; materials: Material[] }>, actorId: number) {
  const db = requireConfigured();
  const { materials: nextMaterials, latitude, longitude, ...fields } = input;
  const update: Record<string, unknown> = { ...fields };
  if (fields.openingHours !== undefined) { update.opening_hours = fields.openingHours; delete update.openingHours; }
  if (fields.estimatedVolume !== undefined) { update.estimated_volume = fields.estimatedVolume; delete update.estimatedVolume; }
  if (fields.photoUrl !== undefined) { update.photo_url = fields.photoUrl; delete update.photoUrl; }
  if (fields.capacityStatus !== undefined) { update.capacity_status = fields.capacityStatus; delete update.capacityStatus; }
  if (latitude !== undefined) update.latitude = latitude;
  if (longitude !== undefined) update.longitude = longitude;
  if (Object.keys(update).length) { const { error } = await db.from("collection_points").update(update).eq("id", pointId); if (error) throw error; }
  if (nextMaterials) { const { error: deleteError } = await db.from("point_materials").delete().eq("point_id", pointId); if (deleteError) throw deleteError; const { error } = await db.from("point_materials").insert(nextMaterials.map((material) => ({ point_id: pointId, material }))); if (error) throw error; }
  await logActivity({ actorId, pointId, type: "point_updated", description: "Ponto atualizado pela administração" });
  return getPointById(pointId, true);
}

export async function reviewCollectionPoint(pointId: number, approved: boolean, adminId: number) {
  const db = requireConfigured();
  const point = await getPointById(pointId, true);
  if (!point) return undefined;
  const { error } = await db.from("collection_points").update({ approval_status: approved ? "aprovado" : "recusado", approved_by_id: adminId, approved_at: new Date().toISOString() }).eq("id", pointId);
  if (error) throw error;
  await logActivity({ actorId: adminId, pointId, type: approved ? "point_approved" : "point_rejected", description: `${approved ? "Ponto aprovado" : "Ponto recusado"}: ${point.name}` });
  return getPointById(pointId, true);
}

export async function deleteCollectionPoint(pointId: number, adminId: number) {
  const db = requireConfigured();
  const point = await getPointById(pointId, true);
  if (!point) return false;
  const { error } = await db.from("collection_points").delete().eq("id", pointId);
  if (error) throw error;
  await logActivity({ actorId: adminId, type: "point_deleted", description: `Ponto removido: ${point.name}` });
  return true;
}

export async function listPendingPoints() { return fetchPoints({ approval_status: "pendente" }); }

export async function listPointMessages(pointId: number) {
  const db = requireConfigured();
  const { data, error } = await db.from("point_messages").select("id, point_id, content, created_at, author_id").eq("point_id", pointId).order("created_at");
  if (error) throw error;
  const authorIds = Array.from(new Set((data ?? []).map((item) => item.author_id)));
  const { data: authors, error: authorError } = authorIds.length ? await db.from("users").select("id, name, community_role").in("id", authorIds) : { data: [], error: null };
  if (authorError) throw authorError;
  const byId = new Map((authors ?? []).map((author) => [author.id, author]));
  return (data ?? []).map((message) => ({ id: message.id, pointId: message.point_id, content: message.content, createdAt: new Date(message.created_at), authorId: message.author_id, authorName: byId.get(message.author_id)?.name ?? null, authorRole: byId.get(message.author_id)?.community_role ?? null }));
}

export async function createPointMessage(pointId: number, authorId: number, content: string) {
  const db = requireConfigured();
  const point = await getPointById(pointId, true);
  if (!point || point.approvalStatus !== "aprovado") return undefined;
  const { error } = await db.from("point_messages").insert({ point_id: pointId, author_id: authorId, content });
  if (error) throw error;
  await logActivity({ actorId: authorId, pointId, type: "message_sent", description: `Mensagem enviada no ponto ${point.name}` });
  const messages = await listPointMessages(pointId);
  return messages.at(-1);
}

async function countRows(table: string, filters: Record<string, unknown> = {}) {
  const db = requireConfigured();
  let query = db.from(table).select("id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getPublicStats() {
  return { points: await countRows("collection_points", { approval_status: "aprovado" }), activePoints: await countRows("collection_points", { approval_status: "aprovado", capacity_status: "ativo" }), users: await countRows("users") };
}

export async function getDashboard(userId: number) {
  const db = requireConfigured();
  const [myPointCount, messageCount, myPoints] = await Promise.all([countRows("collection_points", { owner_id: userId }), countRows("point_messages", { author_id: userId }), listPointsForOwner(userId)]);
  const { data: recent, error } = await db.from("point_messages").select("id, content, created_at, collection_points(name)").eq("author_id", userId).order("created_at", { ascending: false }).limit(3);
  if (error) throw error;
  return { myPointCount, messageCount, myPoints, recentMessages: (recent ?? []).map((item: any) => ({ id: item.id, content: item.content, createdAt: new Date(item.created_at), pointName: Array.isArray(item.collection_points) ? item.collection_points[0]?.name : item.collection_points?.name })) };
}

export async function getAdminOverview() {
  const db = requireConfigured();
  const [usersCount, donors, collectors, activePoints, newUsers, pendingPoints] = await Promise.all([countRows("users"), countRows("users", { community_role: "Doador" }), countRows("users", { community_role: "Catador" }), countRows("collection_points", { approval_status: "aprovado", capacity_status: "ativo" }), db.from("users").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).then(({ count, error }) => { if (error) throw error; return count ?? 0; }), listPendingPoints()]);
  const { data: activities, error } = await db.from("activity_logs").select("id, type, description, created_at, users(name)").order("created_at", { ascending: false }).limit(8);
  if (error) throw error;
  return { stats: { users: usersCount, donors, collectors, activePoints, newUsers }, pendingPoints, activities: (activities ?? []).map((item: any) => ({ id: item.id, type: item.type, description: item.description, createdAt: new Date(item.created_at), actorName: Array.isArray(item.users) ? item.users[0]?.name : item.users?.name })) };
}

export async function logActivity(input: { actorId?: number | null; pointId?: number | null; type: (typeof activityTypes)[number]; description: string }) {
  const db = requireConfigured();
  const { error } = await db.from("activity_logs").insert({ actor_id: input.actorId ?? null, point_id: input.pointId ?? null, type: input.type, description: input.description });
  if (error) throw error;
}

export { communityRoles, materials, pointStatuses };
