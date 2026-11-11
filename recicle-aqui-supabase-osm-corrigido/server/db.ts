import { TRPCError } from "@trpc/server";
import { throwAuthError, throwDatabaseError } from "./errors";
import { ENV } from "./_core/env";
import { getSupabase, createAuthClient } from "./supabase";
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
    throwDatabaseError({});
  }
  return supabase();
}

function toPoint(
  row: PointRecord,
  pointMaterials: Array<{ material: Material }>
): PointView {
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
  const { data, error } = await db
    .from("point_materials")
    .select("point_id, material")
    .in(
      "point_id",
      rows.map(row => row.id)
    );
  if (error) throwDatabaseError(error);
  const byPoint = new Map<number, Array<{ material: Material }>>();
  for (const item of data ?? []) {
    const list = byPoint.get(item.point_id) ?? [];
    list.push({ material: item.material as Material });
    byPoint.set(item.point_id, list);
  }
  return rows.map(row => toPoint(row, byPoint.get(row.id) ?? []));
}

async function fetchPoints(filters: Record<string, unknown> = {}) {
  const db = requireConfigured();
  let query = db.from("collection_points").select("*").order("name");
  for (const [key, value] of Object.entries(filters))
    query = query.eq(key, value);
  const { data, error } = await query;
  if (error) throwDatabaseError(error);
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
  const { data: existing, error: lookupError } = await db
    .from("users")
    .select("id")
    .eq("open_id", user.openId)
    .maybeSingle();
  if (lookupError) throwDatabaseError(lookupError);
  const payload = {
    open_id: user.openId,
    ...(user.name !== undefined ? { name: user.name } : {}),
    ...(user.email !== undefined ? { email: user.email } : {}),
    ...(user.loginMethod !== undefined
      ? { login_method: user.loginMethod }
      : {}),
    ...(user.openId === ENV.ownerOpenId
      ? { role: "admin" }
      : user.role !== undefined
        ? { role: user.role }
        : !existing
          ? { role: "user" }
          : {}),
    last_signed_in: (user.lastSignedIn ?? new Date()).toISOString(),
  };
  const { error } = existing
    ? await db.from("users").update(payload).eq("open_id", user.openId)
    : await db.from("users").insert(payload);
  if (error) throwDatabaseError(error);
}

export async function getUserByOpenId(openId: string) {
  const db = requireConfigured();
  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("open_id", openId)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  return data
    ? {
        id: data.id,
        openId: data.open_id,
        name: data.name,
        email: data.email,
        loginMethod: data.login_method,
        role: data.role,
        communityRole: data.community_role,
        phone: data.phone,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        lastSignedIn: new Date(data.last_signed_in),
      }
    : undefined;
}

export async function registerWithEmail(input: {
  name: string;
  email: string;
  password: string;
}) {
  const client = requireConfigured();
  const { data, error } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  });
  if (error) throwAuthError(error, true);
  if (!data.user) throwDatabaseError({});
  await upsertUser({
    openId: data.user.id,
    name: input.name,
    email: input.email,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
  const user = await getUserByOpenId(data.user.id);
  if (!user)
    throw new Error("Conta criada, mas o perfil não pôde ser preparado.");
  return user;
}

export async function loginWithEmail(input: {
  email: string;
  password: string;
}) {
  const client = createAuthClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throwAuthError(error);
  if (!data.user) throwDatabaseError({});
  let user = await getUserByOpenId(data.user.id);
  if (!user) {
    await upsertUser({
      openId: data.user.id,
      name:
        typeof data.user.user_metadata?.name === "string"
          ? data.user.user_metadata.name
          : null,
      email: data.user.email ?? input.email,
      loginMethod: "email",
      lastSignedIn: new Date(),
    });
    user = await getUserByOpenId(data.user.id);
  }
  if (!user) throw new Error("Não foi possível carregar o perfil da conta.");
  return user;
}

export async function getCommunityProfile(userId: number) {
  const db = requireConfigured();
  let result = await db
    .from("users")
    .select(
      "id, name, email, phone, avatar_url, community_role, role, created_at"
    )
    .eq("id", userId)
    .maybeSingle();
  if (isMissingAvatarColumn(result.error)) {
    result = await db
      .from("users")
      .select("id, name, email, phone, community_role, role, created_at")
      .eq("id", userId)
      .maybeSingle();
  }
  if (result.error) throwDatabaseError(result.error);
  const { data } = result;
  return (
    data && {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatar_url ?? null,
      communityRole: data.community_role,
      isAdmin: data.role,
      createdAt: new Date(data.created_at),
    }
  );
}

export async function updateCommunityProfile(
  userId: number,
  input: {
    name: string;
    phone?: string | null;
    communityRole: CommunityRole;
    avatarUrl?: string | null;
  }
) {
  const db = requireConfigured();
  const profileChanges = {
    name: input.name,
    phone: input.phone || null,
    community_role: input.communityRole,
  };
  let { error } = await db
    .from("users")
    .update({
      ...profileChanges,
      ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
    })
    .eq("id", userId);
  if (input.avatarUrl !== undefined && isMissingAvatarColumn(error)) {
    if (input.avatarUrl) {
      console.error(
        "[profile.update] Cannot persist avatar: public.users.avatar_url is missing",
        { userId, code: error?.code, message: error?.message }
      );
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "O banco ainda não está preparado para salvar fotos de perfil. Execute supabase/schema.sql no projeto Supabase e tente novamente.",
      });
    }
    ({ error } = await db
      .from("users")
      .update(profileChanges)
      .eq("id", userId));
  }
  if (error) throwDatabaseError(error);
  await logActivity({
    actorId: userId,
    type: "profile_updated",
    description: "Perfil atualizado",
  });
  return getCommunityProfile(userId);
}

function isMissingAvatarColumn(
  error: { code?: string; message?: string } | null
) {
  return (
    (error?.code === "42703" || error?.code === "PGRST204") &&
    /avatar_url/i.test(error.message ?? "")
  );
}

export async function listPublicPoints(input?: {
  search?: string;
  materials?: Material[];
}) {
  const points = await fetchPoints({ approval_status: "aprovado" });
  const search = input?.search?.trim().toLowerCase();
  const filtered = search
    ? points.filter(point =>
        [point.name, point.neighborhood, point.address].some(value =>
          value.toLowerCase().includes(search)
        )
      )
    : points;
  const requested = input?.materials ?? [];
  return requested.length
    ? filtered.filter(point =>
        requested.every(material => point.materials.includes(material))
      )
    : filtered;
}

export async function getPointById(pointId: number, includeUnapproved = false) {
  const db = requireConfigured();
  let query = db.from("collection_points").select("*").eq("id", pointId);
  if (!includeUnapproved) query = query.eq("approval_status", "aprovado");
  const { data, error } = await query.maybeSingle();
  if (error) throwDatabaseError(error);
  return data ? (await withMaterials([data as PointRecord]))[0] : undefined;
}

export async function listPointsForOwner(ownerId: number) {
  return fetchPoints({ owner_id: ownerId });
}

export async function createCollectionPoint(
  ownerId: number,
  input: {
    name: string;
    neighborhood: string;
    address: string;
    openingHours: string;
    description: string;
    estimatedVolume?: string;
    photoUrl?: string;
    latitude: number;
    longitude: number;
    materials: Material[];
  }
) {
  const db = requireConfigured();
  const { data, error } = await db
    .from("collection_points")
    .insert({
      owner_id: ownerId,
      name: input.name,
      neighborhood: input.neighborhood,
      address: input.address,
      opening_hours: input.openingHours,
      description: input.description,
      estimated_volume: input.estimatedVolume || "Não informado",
      photo_url: input.photoUrl || null,
      latitude: input.latitude,
      longitude: input.longitude,
      approval_status: "pendente",
      capacity_status: "ativo",
    })
    .select()
    .single();
  if (error) throwDatabaseError(error);
  const { error: materialError } = await db
    .from("point_materials")
    .insert(input.materials.map(material => ({ point_id: data.id, material })));
  if (materialError) throwDatabaseError(materialError);
  await logActivity({
    actorId: ownerId,
    pointId: data.id,
    type: "point_created",
    description: `Novo ponto cadastrado: ${input.name}`,
  });
  return getPointById(data.id, true);
}

export async function updateCollectionPoint(
  pointId: number,
  input: Partial<{
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
    materials: Material[];
  }>,
  actorId: number
) {
  const db = requireConfigured();
  const { materials: nextMaterials, latitude, longitude, ...fields } = input;
  const update: Record<string, unknown> = { ...fields };
  if (fields.openingHours !== undefined) {
    update.opening_hours = fields.openingHours;
    delete update.openingHours;
  }
  if (fields.estimatedVolume !== undefined) {
    update.estimated_volume = fields.estimatedVolume;
    delete update.estimatedVolume;
  }
  if (fields.photoUrl !== undefined) {
    update.photo_url = fields.photoUrl;
    delete update.photoUrl;
  }
  if (fields.capacityStatus !== undefined) {
    update.capacity_status = fields.capacityStatus;
    delete update.capacityStatus;
  }
  if (latitude !== undefined) update.latitude = latitude;
  if (longitude !== undefined) update.longitude = longitude;
  if (Object.keys(update).length) {
    const { error } = await db
      .from("collection_points")
      .update(update)
      .eq("id", pointId);
    if (error) throwDatabaseError(error);
  }
  if (nextMaterials) {
    const { error: deleteError } = await db
      .from("point_materials")
      .delete()
      .eq("point_id", pointId);
    if (deleteError) throwDatabaseError(deleteError);
    const { error } = await db
      .from("point_materials")
      .insert(nextMaterials.map(material => ({ point_id: pointId, material })));
    if (error) throwDatabaseError(error);
  }
  await logActivity({
    actorId,
    pointId,
    type: "point_updated",
    description: "Ponto atualizado pela administração",
  });
  return getPointById(pointId, true);
}

export async function reviewCollectionPoint(
  pointId: number,
  approved: boolean,
  adminId: number
) {
  const db = requireConfigured();
  const point = await getPointById(pointId, true);
  if (!point) return undefined;
  const { error } = await db
    .from("collection_points")
    .update({
      approval_status: approved ? "aprovado" : "recusado",
      approved_by_id: adminId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", pointId);
  if (error) throwDatabaseError(error);
  await logActivity({
    actorId: adminId,
    pointId,
    type: approved ? "point_approved" : "point_rejected",
    description: `${approved ? "Ponto aprovado" : "Ponto recusado"}: ${point.name}`,
  });
  return getPointById(pointId, true);
}

export async function deleteCollectionPoint(pointId: number, adminId: number) {
  const db = requireConfigured();
  const point = await getPointById(pointId, true);
  if (!point) return false;
  const { error } = await db
    .from("collection_points")
    .delete()
    .eq("id", pointId);
  if (error) throwDatabaseError(error);
  await logActivity({
    actorId: adminId,
    type: "point_deleted",
    description: `Ponto removido: ${point.name}`,
  });
  return true;
}

export async function listPendingPoints() {
  return fetchPoints({ approval_status: "pendente" });
}

export async function listPointMessages(pointId: number) {
  const point = await getPointById(pointId);
  if (!point) return [];
  const db = requireConfigured();
  const { data, error } = await db
    .from("point_messages")
    .select("id, point_id, content, created_at, author_id")
    .eq("point_id", pointId)
    .order("created_at");
  if (error) throwDatabaseError(error);
  const authorIds = Array.from(
    new Set((data ?? []).map(item => item.author_id))
  );
  const { data: authors, error: authorError } = authorIds.length
    ? await db
        .from("users")
        .select("id, name, avatar_url, community_role")
        .in("id", authorIds)
    : { data: [], error: null };
  if (authorError) throwDatabaseError(authorError);
  const byId = new Map((authors ?? []).map(author => [author.id, author]));
  return (data ?? []).map(message => ({
    id: message.id,
    pointId: message.point_id,
    content: message.content,
    createdAt: new Date(message.created_at),
    authorId: message.author_id,
    authorName: byId.get(message.author_id)?.name ?? null,
    authorAvatarUrl: byId.get(message.author_id)?.avatar_url ?? null,
    authorRole: byId.get(message.author_id)?.community_role ?? null,
  }));
}

export async function createPointMessage(
  pointId: number,
  authorId: number,
  content: string
) {
  const db = requireConfigured();
  const point = await getPointById(pointId, true);
  if (!point || point.approvalStatus !== "aprovado") return undefined;
  const { error } = await db
    .from("point_messages")
    .insert({ point_id: pointId, author_id: authorId, content });
  if (error) throwDatabaseError(error);
  await logActivity({
    actorId: authorId,
    pointId,
    type: "message_sent",
    description: `Mensagem enviada no ponto ${point.name}`,
  });
  const messages = await listPointMessages(pointId);
  return messages.at(-1);
}

async function countRows(table: string, filters: Record<string, unknown> = {}) {
  const db = requireConfigured();
  let query = db.from(table).select("id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters))
    query = query.eq(key, value);
  const { count, error } = await query;
  if (error) throwDatabaseError(error);
  return count ?? 0;
}

export async function getPublicStats() {
  return {
    points: await countRows("collection_points", {
      approval_status: "aprovado",
    }),
    activePoints: await countRows("collection_points", {
      approval_status: "aprovado",
      capacity_status: "ativo",
    }),
    users: await countRows("users"),
  };
}

export async function getDashboard(userId: number) {
  const db = requireConfigured();
  const [myPointCount, messageCount, myPoints] = await Promise.all([
    countRows("collection_points", { owner_id: userId }),
    countRows("point_messages", { author_id: userId }),
    listPointsForOwner(userId),
  ]);
  const { data: recent, error } = await db
    .from("point_messages")
    .select("id, point_id, content, created_at, collection_points(name)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throwDatabaseError(error);
  return {
    myPointCount,
    messageCount,
    myPoints,
    recentMessages: (recent ?? []).map((item: any) => ({
      id: item.id,
      pointId: item.point_id,
      content: item.content,
      createdAt: new Date(item.created_at),
      pointName: Array.isArray(item.collection_points)
        ? item.collection_points[0]?.name
        : item.collection_points?.name,
    })),
  };
}

export async function getAdminOverview() {
  const db = requireConfigured();
  const [
    usersCount,
    donors,
    collectors,
    activePoints,
    newUsers,
    pendingPoints,
    allPoints,
  ] = await Promise.all([
    countRows("users"),
    countRows("users", { community_role: "Doador" }),
    countRows("users", { community_role: "Catador" }),
    countRows("collection_points", {
      approval_status: "aprovado",
      capacity_status: "ativo",
    }),
    db
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .then(({ count, error }) => {
        if (error) throwDatabaseError(error);
        return count ?? 0;
      }),
    listPendingPoints(),
    fetchPoints(),
  ]);
  const { data: activities, error } = await db
    .from("activity_logs")
    .select("id, type, description, created_at, users(name)")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throwDatabaseError(error);
  return {
    stats: { users: usersCount, donors, collectors, activePoints, newUsers },
    pendingPoints,
    allPoints,
    activities: (activities ?? []).map((item: any) => ({
      id: item.id,
      type: item.type,
      description: item.description,
      createdAt: new Date(item.created_at),
      actorName: Array.isArray(item.users)
        ? item.users[0]?.name
        : item.users?.name,
    })),
  };
}

export async function logActivity(input: {
  actorId?: number | null;
  pointId?: number | null;
  type: (typeof activityTypes)[number];
  description: string;
}) {
  const db = requireConfigured();
  const { error } = await db.from("activity_logs").insert({
    actor_id: input.actorId ?? null,
    point_id: input.pointId ?? null,
    type: input.type,
    description: input.description,
  });
  if (error) throwDatabaseError(error);
}

export { communityRoles, materials, pointStatuses };
