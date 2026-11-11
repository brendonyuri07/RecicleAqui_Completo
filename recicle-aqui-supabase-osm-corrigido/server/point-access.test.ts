import { describe, expect, it, vi } from "vitest";
import { throwAuthError, throwDatabaseError } from "./errors";
import type { TrpcContext } from "./_core/context";

const { getPointById } = vi.hoisted(() => ({ getPointById: vi.fn() }));
vi.mock("./db", () => ({ getPointById }));
import { appRouter } from "./routers";
const caller = (user: { id: number; role: string } | null) =>
  appRouter.createCaller({
    user,
    req: { headers: {} },
    res: {},
  } as unknown as TrpcContext);
describe("visibility of collection points", () => {
  it("allows the owner to open a pending point from their dashboard", async () => {
    getPointById.mockResolvedValue({
      id: 8,
      ownerId: 42,
      approvalStatus: "pendente",
    });
    await expect(
      caller({ id: 42, role: "user" }).points.byId({ id: 8 })
    ).resolves.toMatchObject({ id: 8 });
  });
  it("hides pending points from anonymous visitors and other members", async () => {
    getPointById.mockResolvedValue({
      id: 8,
      ownerId: 42,
      approvalStatus: "pendente",
    });
    await expect(caller(null).points.byId({ id: 8 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      caller({ id: 99, role: "user" }).points.byId({ id: 8 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("lets administrators review pending points", async () => {
    getPointById.mockResolvedValue({
      id: 8,
      ownerId: 42,
      approvalStatus: "pendente",
    });
    await expect(
      caller({ id: 99, role: "admin" }).points.byId({ id: 8 })
    ).resolves.toMatchObject({ id: 8 });
  });
  it("keeps approved points public", async () => {
    getPointById.mockResolvedValue({
      id: 8,
      ownerId: 42,
      approvalStatus: "aprovado",
    });
    await expect(caller(null).points.byId({ id: 8 })).resolves.toMatchObject({
      id: 8,
    });
  });
});
describe("administrative point mutations", () => {
  it("blocks regular members from editing or deleting collection points", async () => {
    const regularUser = caller({ id: 42, role: "user" });
    await expect(
      regularUser.points.update({
        id: 8,
        name: "Ponto atualizado",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(regularUser.points.remove({ id: 8 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
describe("connection and authentication errors", () => {
  it("reports an unavailable service without exposing connection details", () => {
    expect(() =>
      throwDatabaseError({ message: "TypeError: fetch failed at secret-host" })
    ).toThrow("O serviço está indisponível");
    try {
      throwDatabaseError({ message: "TypeError: fetch failed at secret-host" });
    } catch (error) {
      expect(error).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
      expect((error as Error).message).not.toContain("secret-host");
    }
  });
  it("distinguishes invalid credentials from network failures", () => {
    expect(() =>
      throwAuthError({ status: 400, code: "invalid_credentials" })
    ).toThrow("E-mail ou senha inválidos");
    expect(() => throwAuthError({ status: 0 })).toThrow(
      "O serviço está indisponível"
    );
  });
});
