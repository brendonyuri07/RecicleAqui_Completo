import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  existing: true,
  payload: undefined as any,
  updatePayloads: [] as any[],
  owner: "owner-uuid",
  avatarColumnMissing: false,
}));
vi.mock("./_core/env", () => ({ ENV: { supabaseUrl: "https://example.supabase.co", supabaseServerKey: "test", get ownerOpenId() { return mocks.owner; } } }));
vi.mock("./supabase", () => ({
  getSupabase: () => ({ from: (table: string) => ({
    select: (columns: string) => ({ eq: (field: string) => ({ maybeSingle: async () => {
      if (table === "users" && field === "id") {
        if (mocks.avatarColumnMissing && columns.includes("avatar_url")) {
          return { data: null, error: { code: "42703", message: "column users.avatar_url does not exist" } };
        }
        return { data: { id: 1, name: "Pessoa", email: "pessoa@example.com", phone: null, ...(columns.includes("avatar_url") ? { avatar_url: "https://example.com/avatar.png" } : {}), community_role: "Doador", role: "user", created_at: "2026-01-01T00:00:00Z" }, error: null };
      }
      return { data: mocks.existing ? { id: 1 } : null, error: null };
    } }) }),
    update: (payload: any) => { mocks.payload = payload; mocks.updatePayloads.push(payload); return { eq: async () => ({ error: mocks.avatarColumnMissing && "avatar_url" in payload ? { code: "42703", message: "column users.avatar_url does not exist" } : null }) }; },
    insert: async (payload: any) => { mocks.payload = payload; return { error: null }; },
  }) }),
  createAuthClient: vi.fn(),
}));
import { getCommunityProfile, updateCommunityProfile, upsertUser } from "./db";
describe("session profile preservation", () => {
  beforeEach(() => { mocks.existing = true; mocks.payload = undefined; mocks.updatePayloads = []; mocks.avatarColumnMissing = false; });
  it("does not erase a profile or demote an administrator on session refresh", async () => {
    await upsertUser({ openId: "existing-admin", lastSignedIn: new Date() });
    expect(mocks.payload).not.toHaveProperty("name");
    expect(mocks.payload).not.toHaveProperty("email");
    expect(mocks.payload).not.toHaveProperty("role");
  });
  it("grants the configured owner administration by immutable user id", async () => {
    await upsertUser({ openId: "owner-uuid" });
    expect(mocks.payload.role).toBe("admin");
  });
  it("creates ordinary accounts without administrative access", async () => {
    mocks.existing = false;
    await upsertUser({ openId: "new-user", name: "Pessoa" });
    expect(mocks.payload.role).toBe("user");
    expect(mocks.payload.name).toBe("Pessoa");
  });

  it("loads profiles from databases that have not added avatar_url", async () => {
    mocks.avatarColumnMissing = true;
    await expect(getCommunityProfile(1)).resolves.toMatchObject({
      name: "Pessoa",
      avatarUrl: null,
    });
  });

  it("keeps profile edits working when avatar_url is missing", async () => {
    mocks.avatarColumnMissing = true;
    await updateCommunityProfile(1, {
      name: "Pessoa Atualizada",
      communityRole: "Doador",
      avatarUrl: null,
    });
    expect(mocks.updatePayloads).toHaveLength(2);
    expect(mocks.updatePayloads[1]).not.toHaveProperty("avatar_url");
  });

  it("writes the public avatar reference when the avatar column exists", async () => {
    const avatarUrl = "https://example.com/avatar.webp";
    await updateCommunityProfile(1, {
      name: "Pessoa Atualizada",
      communityRole: "Doador",
      avatarUrl,
    });
    expect(mocks.updatePayloads[0]).toHaveProperty("avatar_url", avatarUrl);
  });

  it("does not report success when an uploaded avatar cannot be persisted", async () => {
    mocks.avatarColumnMissing = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      updateCommunityProfile(1, {
        name: "Pessoa Atualizada",
        communityRole: "Doador",
        avatarUrl: "https://example.com/avatar.webp",
      })
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("Execute supabase/schema.sql"),
    });
    expect(mocks.updatePayloads).toHaveLength(1);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("avatar_url is missing"),
      expect.objectContaining({ userId: 1, code: "42703" })
    );
    log.mockRestore();
  });
});
