import { and, asc, count, desc, eq, gte, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activityLogs,
  collectionPoints,
  pointMaterials,
  pointMessages,
  users,
  type CommunityRole,
  type Material,
  type PointStatus,
} from "../drizzle/schema";
import type { InsertUser } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to initialize:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getCommunityProfile(userId: number) {
  const db = await requireDb();
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      communityRole: users.communityRole,
      isAdmin: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result[0];
}

export async function updateCommunityProfile(
  userId: number,
  input: { name: string; phone?: string | null; communityRole: CommunityRole },
) {
  const db = await requireDb();
  await db
    .update(users)
    .set({ name: input.name, phone: input.phone || null, communityRole: input.communityRole })
    .where(eq(users.id, userId));
  await logActivity({ actorId: userId, type: "profile_updated", description: "Perfil atualizado" });
  return getCommunityProfile(userId);
}

type PointRow = {
  point: typeof collectionPoints.$inferSelect;
  material: typeof pointMaterials.$inferSelect | null;
};

function mapPoints(rows: PointRow[]) {
  const result = new Map<number, {
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
    approvalStatus: "pendente" | "aprovado" | "recusado";
    materials: Material[];
    createdAt: Date;
    updatedAt: Date;
  }>();

  for (const row of rows) {
    const point = row.point;
    let mapped = result.get(point.id);
    if (!mapped) {
      mapped = {
        id: point.id,
        ownerId: point.ownerId,
        name: point.name,
        neighborhood: point.neighborhood,
        address: point.address,
        openingHours: point.openingHours,
        description: point.description,
        estimatedVolume: point.estimatedVolume,
        photoUrl: point.photoUrl,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        capacityStatus: point.capacityStatus,
        approvalStatus: point.approvalStatus,
        materials: [],
        createdAt: point.createdAt,
        updatedAt: point.updatedAt,
      };
      result.set(point.id, mapped);
    }
    if (row.material && !mapped.materials.includes(row.material.material)) {
      mapped.materials.push(row.material.material);
    }
  }

  return Array.from(result.values());
}

async function queryPoints(whereClause?: ReturnType<typeof and>) {
  const db = await requireDb();
  const rows = await db
    .select({ point: collectionPoints, material: pointMaterials })
    .from(collectionPoints)
    .leftJoin(pointMaterials, eq(pointMaterials.pointId, collectionPoints.id))
    .where(whereClause)
    .orderBy(asc(collectionPoints.name));
  return mapPoints(rows);
}

export async function listPublicPoints(input?: { search?: string; materials?: Material[] }) {
  const search = input?.search?.trim();
  const whereClause = and(
    eq(collectionPoints.approvalStatus, "aprovado"),
    search
      ? or(
          like(collectionPoints.name, `%${search}%`),
          like(collectionPoints.neighborhood, `%${search}%`),
          like(collectionPoints.address, `%${search}%`),
        )
      : undefined,
  );
  const list = await queryPoints(whereClause);
  const requested = input?.materials ?? [];
  return requested.length === 0 ? list : list.filter((point) => requested.every((material) => point.materials.includes(material)));
}

export async function getPointById(pointId: number, includeUnapproved = false) {
  const point = await queryPoints(
    and(
      eq(collectionPoints.id, pointId),
      includeUnapproved ? undefined : eq(collectionPoints.approvalStatus, "aprovado"),
    ),
  );
  return point[0];
}

export async function listPointsForOwner(ownerId: number) {
  return queryPoints(eq(collectionPoints.ownerId, ownerId));
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
  },
) {
  const db = await requireDb();
  const [created] = await db
    .insert(collectionPoints)
    .values({
      ownerId,
      name: input.name,
      neighborhood: input.neighborhood,
      address: input.address,
      openingHours: input.openingHours,
      description: input.description,
      estimatedVolume: input.estimatedVolume || "Não informado",
      photoUrl: input.photoUrl || null,
      latitude: String(input.latitude),
      longitude: String(input.longitude),
      approvalStatus: "pendente",
      capacityStatus: "ativo",
    })
    .$returningId();

  await db.insert(pointMaterials).values(input.materials.map((material) => ({ pointId: created.id, material })));
  await logActivity({
    actorId: ownerId,
    pointId: created.id,
    type: "point_created",
    description: `Novo ponto cadastrado: ${input.name}`,
  });
  return getPointById(created.id, true);
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
  actorId: number,
) {
  const db = await requireDb();
  const { materials: nextMaterials, latitude, longitude, ...fields } = input;
  const update: Record<string, unknown> = { ...fields };
  if (latitude !== undefined) update.latitude = String(latitude);
  if (longitude !== undefined) update.longitude = String(longitude);

  if (Object.keys(update).length > 0) {
    await db.update(collectionPoints).set(update).where(eq(collectionPoints.id, pointId));
  }
  if (nextMaterials) {
    await db.delete(pointMaterials).where(eq(pointMaterials.pointId, pointId));
    await db.insert(pointMaterials).values(nextMaterials.map((material) => ({ pointId, material })));
  }
  await logActivity({ actorId, pointId, type: "point_updated", description: "Ponto atualizado pela administração" });
  return getPointById(pointId, true);
}

export async function reviewCollectionPoint(pointId: number, approved: boolean, adminId: number) {
  const db = await requireDb();
  const point = await getPointById(pointId, true);
  if (!point) return undefined;
  await db
    .update(collectionPoints)
    .set({
      approvalStatus: approved ? "aprovado" : "recusado",
      approvedById: adminId,
      approvedAt: new Date(),
    })
    .where(eq(collectionPoints.id, pointId));
  await logActivity({
    actorId: adminId,
    pointId,
    type: approved ? "point_approved" : "point_rejected",
    description: `${approved ? "Ponto aprovado" : "Ponto recusado"}: ${point.name}`,
  });
  return getPointById(pointId, true);
}

export async function deleteCollectionPoint(pointId: number, adminId: number) {
  const db = await requireDb();
  const point = await getPointById(pointId, true);
  if (!point) return false;
  await db.delete(collectionPoints).where(eq(collectionPoints.id, pointId));
  await logActivity({ actorId: adminId, type: "point_deleted", description: `Ponto removido: ${point.name}` });
  return true;
}

export async function listPendingPoints() {
  return queryPoints(eq(collectionPoints.approvalStatus, "pendente"));
}

export async function listPointMessages(pointId: number) {
  const db = await requireDb();
  return db
    .select({
      id: pointMessages.id,
      pointId: pointMessages.pointId,
      content: pointMessages.content,
      createdAt: pointMessages.createdAt,
      authorId: users.id,
      authorName: users.name,
      authorRole: users.communityRole,
    })
    .from(pointMessages)
    .innerJoin(users, eq(users.id, pointMessages.authorId))
    .where(eq(pointMessages.pointId, pointId))
    .orderBy(asc(pointMessages.createdAt));
}

export async function createPointMessage(pointId: number, authorId: number, content: string) {
  const db = await requireDb();
  const point = await getPointById(pointId, true);
  if (!point || point.approvalStatus !== "aprovado") return undefined;
  const [created] = await db.insert(pointMessages).values({ pointId, authorId, content }).$returningId();
  await logActivity({ actorId: authorId, pointId, type: "message_sent", description: `Mensagem enviada no ponto ${point.name}` });
  const messages = await listPointMessages(pointId);
  return messages.find((message) => message.id === created.id);
}

export async function getPublicStats() {
  const db = await requireDb();
  const [pointCount] = await db.select({ value: count() }).from(collectionPoints).where(eq(collectionPoints.approvalStatus, "aprovado"));
  const [activeCount] = await db.select({ value: count() }).from(collectionPoints).where(and(eq(collectionPoints.approvalStatus, "aprovado"), eq(collectionPoints.capacityStatus, "ativo")));
  const [userCount] = await db.select({ value: count() }).from(users);
  return {
    points: Number(pointCount?.value ?? 0),
    activePoints: Number(activeCount?.value ?? 0),
    users: Number(userCount?.value ?? 0),
  };
}

export async function getDashboard(userId: number) {
  const db = await requireDb();
  const [myPointCount] = await db.select({ value: count() }).from(collectionPoints).where(eq(collectionPoints.ownerId, userId));
  const [messageCount] = await db.select({ value: count() }).from(pointMessages).where(eq(pointMessages.authorId, userId));
  const myPoints = await listPointsForOwner(userId);
  const recentMessages = await db
    .select({
      id: pointMessages.id,
      content: pointMessages.content,
      createdAt: pointMessages.createdAt,
      pointName: collectionPoints.name,
    })
    .from(pointMessages)
    .innerJoin(collectionPoints, eq(collectionPoints.id, pointMessages.pointId))
    .where(eq(pointMessages.authorId, userId))
    .orderBy(desc(pointMessages.createdAt))
    .limit(3);

  return {
    myPointCount: Number(myPointCount?.value ?? 0),
    messageCount: Number(messageCount?.value ?? 0),
    myPoints,
    recentMessages,
  };
}

export async function getAdminOverview() {
  const db = await requireDb();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [userCount] = await db.select({ value: count() }).from(users);
  const [donorCount] = await db.select({ value: count() }).from(users).where(eq(users.communityRole, "Doador"));
  const [collectorCount] = await db.select({ value: count() }).from(users).where(eq(users.communityRole, "Catador"));
  const [activePointCount] = await db.select({ value: count() }).from(collectionPoints).where(and(eq(collectionPoints.approvalStatus, "aprovado"), eq(collectionPoints.capacityStatus, "ativo")));
  const [newUserCount] = await db.select({ value: count() }).from(users).where(gte(users.createdAt, oneWeekAgo));
  const pendingPoints = await listPendingPoints();
  const activities = await db
    .select({
      id: activityLogs.id,
      type: activityLogs.type,
      description: activityLogs.description,
      createdAt: activityLogs.createdAt,
      actorName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(users.id, activityLogs.actorId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(8);

  return {
    stats: {
      users: Number(userCount?.value ?? 0),
      donors: Number(donorCount?.value ?? 0),
      collectors: Number(collectorCount?.value ?? 0),
      activePoints: Number(activePointCount?.value ?? 0),
      newUsers: Number(newUserCount?.value ?? 0),
    },
    pendingPoints,
    activities,
  };
}

export async function logActivity(input: {
  actorId?: number | null;
  pointId?: number | null;
  type: (typeof activityLogs.type.enumValues)[number];
  description: string;
}) {
  const db = await requireDb();
  await db.insert(activityLogs).values({
    actorId: input.actorId ?? null,
    pointId: input.pointId ?? null,
    type: input.type,
    description: input.description,
  });
}
