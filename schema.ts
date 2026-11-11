import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

export const communityRoles = ["Doador", "Catador"] as const;
export const pointStatuses = ["ativo", "proximo", "lotado"] as const;
export const approvalStatuses = ["pendente", "aprovado", "recusado"] as const;
export const materials = ["Papel", "Plástico", "Vidro", "Metal", "Eletrônicos"] as const;
export const activityTypes = [
  "user_registered",
  "profile_updated",
  "point_created",
  "point_approved",
  "point_rejected",
  "point_updated",
  "point_deleted",
  "message_sent",
] as const;

/** Core identity table populated by the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  communityRole: mysqlEnum("communityRole", communityRoles).default("Doador").notNull(),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const collectionPoints = mysqlTable(
  "collection_points",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    neighborhood: varchar("neighborhood", { length: 120 }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    openingHours: varchar("openingHours", { length: 160 }).notNull(),
    description: text("description").notNull(),
    estimatedVolume: varchar("estimatedVolume", { length: 80 }).notNull().default("Não informado"),
    photoUrl: varchar("photoUrl", { length: 1024 }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
    capacityStatus: mysqlEnum("capacityStatus", pointStatuses).default("ativo").notNull(),
    approvalStatus: mysqlEnum("approvalStatus", approvalStatuses).default("pendente").notNull(),
    approvedById: int("approvedById").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("collection_points_approval_idx").on(table.approvalStatus),
    index("collection_points_owner_idx").on(table.ownerId),
    index("collection_points_location_idx").on(table.latitude, table.longitude),
  ],
);

export const pointMaterials = mysqlTable(
  "point_materials",
  {
    id: int("id").autoincrement().primaryKey(),
    pointId: int("pointId").notNull().references(() => collectionPoints.id, { onDelete: "cascade" }),
    material: mysqlEnum("material", materials).notNull(),
  },
  (table) => [
    index("point_materials_point_idx").on(table.pointId),
    index("point_materials_material_idx").on(table.material),
  ],
);

export const pointMessages = mysqlTable(
  "point_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    pointId: int("pointId").notNull().references(() => collectionPoints.id, { onDelete: "cascade" }),
    authorId: int("authorId").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("point_messages_point_created_idx").on(table.pointId, table.createdAt),
    index("point_messages_author_idx").on(table.authorId),
  ],
);

export const activityLogs = mysqlTable(
  "activity_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorId: int("actorId").references(() => users.id, { onDelete: "set null" }),
    pointId: int("pointId").references(() => collectionPoints.id, { onDelete: "set null" }),
    type: mysqlEnum("type", activityTypes).notNull(),
    description: varchar("description", { length: 300 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("activity_logs_created_idx").on(table.createdAt),
    index("activity_logs_point_idx").on(table.pointId),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CollectionPoint = typeof collectionPoints.$inferSelect;
export type PointMaterial = typeof pointMaterials.$inferSelect;
export type PointMessage = typeof pointMessages.$inferSelect;
export type Material = (typeof materials)[number];
export type CommunityRole = (typeof communityRoles)[number];
export type PointStatus = (typeof pointStatuses)[number];
export type ApprovalStatus = (typeof approvalStatuses)[number];
