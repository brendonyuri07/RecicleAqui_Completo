import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({
  updateCommunityProfile: vi.fn(),
  createCollectionPoint: vi.fn(),
  updateCollectionPoint: vi.fn(),
  getPointById: vi.fn(),
}));

vi.mock("./db", () => db);

function context(user: { id: number; role: string }): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} },
    res: { clearCookie: () => undefined },
  } as unknown as TrpcContext;
}

const photoUrl =
  "https://example.supabase.co/storage/v1/object/public/recicle-images/point/42/image.webp";

describe("image reference persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.updateCommunityProfile.mockResolvedValue({
      id: 42,
      avatarUrl: photoUrl,
    });
    db.createCollectionPoint.mockResolvedValue({ id: 12, photoUrl });
    db.updateCollectionPoint.mockResolvedValue({ id: 12, photoUrl });
    db.getPointById.mockResolvedValue({ id: 12, ownerId: 42 });
  });

  it("persists an uploaded avatar reference on the authenticated profile", async () => {
    const caller = appRouter.createCaller(context({ id: 42, role: "user" }));
    await caller.profile.update({
      name: "Pessoa",
      communityRole: "Doador",
      avatarUrl: photoUrl,
    });
    expect(db.updateCommunityProfile).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ avatarUrl: photoUrl })
    );
  });

  it("persists a photo reference when creating a collection point", async () => {
    const caller = appRouter.createCaller(context({ id: 42, role: "user" }));
    await caller.points.create({
      name: "Ponto Centro",
      neighborhood: "Centro",
      address: "Rua Central, 100",
      openingHours: "Segunda a sexta",
      description: "Local para entrega de materiais recicláveis.",
      latitude: -21.406,
      longitude: -48.505,
      materials: ["Papel"],
      photoUrl,
    });
    expect(db.createCollectionPoint).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ photoUrl })
    );
  });

  it("preserves an existing point photo unless an edit supplies a replacement", async () => {
    const caller = appRouter.createCaller(context({ id: 1, role: "admin" }));
    await caller.points.update({ id: 12, name: "Ponto atualizado" });
    expect(db.updateCollectionPoint).toHaveBeenCalledWith(
      12,
      { name: "Ponto atualizado" },
      1
    );

    await caller.points.update({ id: 12, photoUrl });
    expect(db.updateCollectionPoint).toHaveBeenLastCalledWith(
      12,
      { photoUrl },
      1
    );
  });
});
