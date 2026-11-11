import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { approvalStatuses, communityRoles, materials, pointStatuses } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const communityRoleSchema = z.enum(communityRoles);
const materialSchema = z.enum(materials);
const pointStatusSchema = z.enum(pointStatuses);

export const createPointInput = z.object({
  name: z.string().trim().min(2, "Informe o nome do ponto.").max(160),
  neighborhood: z.string().trim().min(2, "Informe o bairro.").max(120),
  address: z.string().trim().min(5, "Informe o endereço.").max(255),
  openingHours: z.string().trim().min(2, "Informe o horário.").max(160),
  description: z.string().trim().min(10, "Descreva o ponto com pelo menos 10 caracteres.").max(2000),
  estimatedVolume: z.string().trim().max(80).optional(),
  photoUrl: z.union([z.string().url(), z.literal("")]).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  materials: z.array(materialSchema).min(1, "Selecione ao menos um material.").max(materials.length),
});

const updatePointInput = createPointInput.partial().extend({
  id: z.number().int().positive(),
  capacityStatus: pointStatusSchema.optional(),
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito à administração." });
  }
  return next({ ctx });
});

function notFound(message: string) {
  return new TRPCError({ code: "NOT_FOUND", message });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  public: router({
    stats: publicProcedure.query(() => db.getPublicStats()),
  }),

  profile: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getCommunityProfile(ctx.user.id);
      if (!profile) throw notFound("Perfil não encontrado.");
      return profile;
    }),
    update: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(180), phone: z.string().trim().max(32).optional(), communityRole: communityRoleSchema }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.updateCommunityProfile(ctx.user.id, input);
        if (!profile) throw notFound("Perfil não encontrado.");
        return profile;
      }),
  }),

  points: router({
    list: publicProcedure
      .input(z.object({ search: z.string().trim().max(160).optional(), materials: z.array(materialSchema).max(materials.length).optional() }).optional())
      .query(({ input }) => db.listPublicPoints(input)),
    byId: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const point = await db.getPointById(input.id);
      if (!point) throw notFound("Ponto de coleta não encontrado.");
      return point;
    }),
    mine: protectedProcedure.query(({ ctx }) => db.listPointsForOwner(ctx.user.id)),
    create: protectedProcedure.input(createPointInput).mutation(({ ctx, input }) => db.createCollectionPoint(ctx.user.id, input)),
    update: adminProcedure.input(updatePointInput).mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;
      const point = await db.updateCollectionPoint(id, changes, ctx.user.id);
      if (!point) throw notFound("Ponto de coleta não encontrado.");
      return point;
    }),
    review: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["aprovado", "recusado"]) }))
      .mutation(async ({ ctx, input }) => {
        const point = await db.reviewCollectionPoint(input.id, input.status === "aprovado", ctx.user.id);
        if (!point) throw notFound("Ponto de coleta não encontrado.");
        return point;
      }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const removed = await db.deleteCollectionPoint(input.id, ctx.user.id);
      if (!removed) throw notFound("Ponto de coleta não encontrado.");
      return { success: true } as const;
    }),
  }),

  messages: router({
    list: publicProcedure.input(z.object({ pointId: z.number().int().positive() })).query(({ input }) => db.listPointMessages(input.pointId)),
    create: protectedProcedure
      .input(z.object({ pointId: z.number().int().positive(), content: z.string().trim().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        const message = await db.createPointMessage(input.pointId, ctx.user.id, input.content);
        if (!message) throw notFound("O ponto não existe ou ainda não foi aprovado.");
        return message;
      }),
  }),

  dashboard: router({
    mine: protectedProcedure.query(({ ctx }) => db.getDashboard(ctx.user.id)),
  }),

  admin: router({
    overview: adminProcedure.query(() => db.getAdminOverview()),
  }),
});

export type AppRouter = typeof appRouter;
