import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  approvalStatuses,
  communityRoles,
  materials,
  pointStatuses,
} from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { createSessionToken } from "./_core/localAuth";
import { validateUploadedImage } from "./imageValidation";

const communityRoleSchema = z.enum(communityRoles);
const materialSchema = z.enum(materials);
const pointStatusSchema = z.enum(pointStatuses);

export const createPointInput = z.object({
  name: z.string().trim().min(2, "Informe o nome do ponto.").max(160),
  neighborhood: z.string().trim().min(2, "Informe o bairro.").max(120),
  address: z.string().trim().min(5, "Informe o endereço.").max(255),
  openingHours: z.string().trim().min(2, "Informe o horário.").max(160),
  description: z
    .string()
    .trim()
    .min(10, "Descreva o ponto com pelo menos 10 caracteres.")
    .max(2000),
  estimatedVolume: z.string().trim().max(80).optional(),
  photoUrl: z.union([z.string().url(), z.literal("")]).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  materials: z
    .array(materialSchema)
    .min(1, "Selecione ao menos um material.")
    .max(materials.length),
});

const updatePointInput = createPointInput.partial().extend({
  id: z.number().int().positive(),
  photoUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  capacityStatus: pointStatusSchema.optional(),
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito à administração.",
    });
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
    register: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(180),
          email: z.string().trim().email(),
          password: z.string().min(6).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await db.registerWithEmail(input);
        const token = await createSessionToken(user.openId, user.name ?? "");
        ctx.res.cookie(COOKIE_NAME, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 1000 * 60 * 60 * 24 * 365,
        });
        return user;
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email(),
          password: z.string().min(1).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await db.loginWithEmail(input);
        const token = await createSessionToken(user.openId, user.name ?? "");
        ctx.res.cookie(COOKIE_NAME, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 1000 * 60 * 60 * 24 * 365,
        });
        return user;
      }),
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
      .input(
        z.object({
          name: z.string().trim().min(2).max(180),
          phone: z.string().trim().max(32).optional(),
          communityRole: communityRoleSchema,
          avatarUrl: z.string().url().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await db.updateCommunityProfile(ctx.user.id, input);
        if (!profile) throw notFound("Perfil não encontrado.");
        return profile;
      }),
  }),

  media: router({
    uploadImage: protectedProcedure
      .input(
        z.object({
          base64: z
            .string()
            .min(1)
            .max(12_000_000)
            .regex(
              /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
            ),
          contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
          purpose: z.enum(["point", "avatar"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const image = Buffer.from(input.base64, "base64");
        if (image.toString("base64") !== input.base64) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "O arquivo enviado não está codificado corretamente.",
          });
        }
        const validationError = validateUploadedImage(image, input.contentType);
        if (validationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validationError,
          });
        }

        const extension = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        }[input.contentType];
        const path = `${input.purpose}/${ctx.user.id}/${randomUUID()}.${extension}`;
        const supabase = await import("./supabase").then(module =>
          module.getSupabase()
        );
        const { data, error } = await supabase.storage
          .from("recicle-images")
          .upload(path, image, {
            contentType: input.contentType,
            cacheControl: "3600",
            upsert: false,
          });
        if (error) {
          console.error(
            "[media.uploadImage] Supabase Storage rejected upload",
            {
              userId: ctx.user.id,
              purpose: input.purpose,
              contentType: input.contentType,
              imageBytes: image.length,
              error: {
                name: error.name,
                message: error.message,
                status: error.status,
                statusCode: error.statusCode,
              },
            }
          );
          const message = error.message.toLowerCase();
          const isSizeError =
            error.statusCode === "413" ||
            message.includes("payload too large") ||
            message.includes("maximum allowed size");
          const isConfigurationError =
            message.includes("mime") ||
            message.includes("content type") ||
            message.includes("bucket");
          const userMessage = isSizeError
            ? "A imagem excede o limite permitido pelo armazenamento. Tente uma imagem menor."
            : isConfigurationError
              ? "O armazenamento não está configurado para este formato de imagem. Contate o suporte."
              : "Não foi possível enviar a imagem ao armazenamento. Tente novamente ou contate o suporte.";
          throw new TRPCError({
            code: isSizeError
              ? "BAD_REQUEST"
              : isConfigurationError
                ? "PRECONDITION_FAILED"
                : "SERVICE_UNAVAILABLE",
            message: userMessage,
          });
        }
        return {
          url: supabase.storage.from("recicle-images").getPublicUrl(data.path)
            .data.publicUrl,
        };
      }),
  }),

  points: router({
    list: publicProcedure
      .input(
        z
          .object({
            search: z.string().trim().max(160).optional(),
            materials: z.array(materialSchema).max(materials.length).optional(),
          })
          .optional()
      )
      .query(({ input }) => db.listPublicPoints(input)),
    byId: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const point = await db.getPointById(input.id, true);
        if (
          !point ||
          (point.approvalStatus !== "aprovado" &&
            ctx.user?.id !== point.ownerId &&
            ctx.user?.role !== "admin")
        )
          throw notFound("Ponto de coleta não encontrado.");
        return point;
      }),
    mine: protectedProcedure.query(({ ctx }) =>
      db.listPointsForOwner(ctx.user.id)
    ),
    create: protectedProcedure
      .input(createPointInput)
      .mutation(({ ctx, input }) =>
        db.createCollectionPoint(ctx.user.id, input)
      ),
    update: adminProcedure
      .input(updatePointInput)
      .mutation(async ({ ctx, input }) => {
        const { id, ...changes } = input;
        const point = await db.updateCollectionPoint(id, changes, ctx.user.id);
        if (!point) throw notFound("Ponto de coleta não encontrado.");
        return point;
      }),
    review: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["aprovado", "recusado"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const point = await db.reviewCollectionPoint(
          input.id,
          input.status === "aprovado",
          ctx.user.id
        );
        if (!point) throw notFound("Ponto de coleta não encontrado.");
        return point;
      }),
    remove: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const removed = await db.deleteCollectionPoint(input.id, ctx.user.id);
        if (!removed) throw notFound("Ponto de coleta não encontrado.");
        return { success: true } as const;
      }),
  }),

  messages: router({
    list: publicProcedure
      .input(z.object({ pointId: z.number().int().positive() }))
      .query(({ input }) => db.listPointMessages(input.pointId)),
    create: protectedProcedure
      .input(
        z.object({
          pointId: z.number().int().positive(),
          content: z.string().trim().min(1).max(1000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const message = await db.createPointMessage(
          input.pointId,
          ctx.user.id,
          input.content
        );
        if (!message)
          throw notFound("O ponto não existe ou ainda não foi aprovado.");
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
