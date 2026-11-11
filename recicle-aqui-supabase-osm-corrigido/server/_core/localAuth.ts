import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

function key() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET precisa estar configurado.");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(openId: string, name: string) {
  return new SignJWT({ openId, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(key());
}

export async function authenticateLocalRequest(req: Request): Promise<User> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const bearer = typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = cookies[COOKIE_NAME] ?? bearer;
  if (!token) throw ForbiddenError("Sessão inválida.");
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.openId !== "string" || !payload.openId) throw new Error("Sessão sem usuário.");
    const user = await db.getUserByOpenId(payload.openId);
    if (!user) throw ForbiddenError("Conta não encontrada.");
    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    return (await db.getUserByOpenId(user.openId)) ?? user;
  } catch (error) {
    if (error instanceof Error && error.message === "Conta não encontrada.") throw error;
    throw ForbiddenError("Sessão inválida.");
  }
}

