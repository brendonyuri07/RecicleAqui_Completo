import { describe, expect, it } from "vitest";
import { createPointInput, appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const anonymousContext = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => undefined },
} as unknown as TrpcContext;

const regularUserContext = {
  user: { id: 42, role: "user" },
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => undefined },
} as unknown as TrpcContext;

describe("recicle API contracts", () => {
  it("requires authentication to create a collection point", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(
      caller.points.create({
        name: "EcoPonto Centro",
        neighborhood: "Centro",
        address: "Praça Central, 100",
        openingHours: "Seg–Sex · 08h–17h",
        description: "Ponto coberto para recebimento de materiais recicláveis.",
        latitude: -21.406,
        longitude: -48.505,
        materials: ["Papel"],
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects point payloads without recyclable materials", () => {
    expect(() =>
      createPointInput.parse({
        name: "EcoPonto Centro",
        neighborhood: "Centro",
        address: "Praça Central, 100",
        openingHours: "Seg–Sex · 08h–17h",
        description: "Ponto coberto para recebimento de materiais recicláveis.",
        latitude: -21.406,
        longitude: -48.505,
        materials: [],
      }),
    ).toThrow();
  });

  it("blocks administrative reads for regular users before touching the database", async () => {
    const caller = appRouter.createCaller(regularUserContext);
    await expect(caller.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
