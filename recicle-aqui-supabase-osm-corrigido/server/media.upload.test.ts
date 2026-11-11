import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const storage = vi.hoisted(() => ({
  from: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock("./supabase", () => ({
  getSupabase: () => ({ storage: { from: storage.from } }),
}));

const regularUserContext = {
  user: { id: 42, role: "user" },
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => undefined },
} as unknown as TrpcContext;

function png() {
  const image = Buffer.alloc(45);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(image);
  image.writeUInt32BE(13, 8);
  image.write("IHDR", 12);
  image.writeUInt32BE(1200, 16);
  image.writeUInt32BE(800, 20);
  image.write("IEND", 37);
  return image;
}

describe("media image upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.from.mockReturnValue({
      upload: storage.upload,
      getPublicUrl: storage.getPublicUrl,
    });
    storage.upload.mockResolvedValue({
      data: { path: "point/42/stored-image.png" },
      error: null,
    });
    storage.getPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          "https://example.supabase.co/storage/v1/object/public/recicle-images/point/42/stored-image.png",
      },
    });
  });

  it("stores a validated image and returns its public URL", async () => {
    const image = png();
    const caller = appRouter.createCaller(regularUserContext);
    const result = await caller.media.uploadImage({
      base64: image.toString("base64"),
      contentType: "image/png",
      purpose: "point",
    });

    expect(storage.from).toHaveBeenCalledWith("recicle-images");
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^point\/42\/[0-9a-f-]+\.png$/),
      image,
      {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      }
    );
    expect(result.url).toBe(
      "https://example.supabase.co/storage/v1/object/public/recicle-images/point/42/stored-image.png"
    );
  });

  it("stores profile photos under the authenticated user's avatar path", async () => {
    const image = png();
    const caller = appRouter.createCaller(regularUserContext);
    await caller.media.uploadImage({
      base64: image.toString("base64"),
      contentType: "image/png",
      purpose: "avatar",
    });

    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^avatar\/42\/[0-9a-f-]+\.png$/),
      image,
      expect.objectContaining({ contentType: "image/png" })
    );
  });

  it("logs storage configuration failures and returns a useful safe message", async () => {
    storage.upload.mockResolvedValue({
      data: null,
      error: {
        name: "StorageApiError",
        message: "Bucket not found",
        status: 404,
        statusCode: "404",
      },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const caller = appRouter.createCaller(regularUserContext);
    await expect(
      caller.media.uploadImage({
        base64: png().toString("base64"),
        contentType: "image/png",
        purpose: "point",
      })
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("armazenamento não está configurado"),
    });
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("Supabase Storage rejected upload"),
      expect.objectContaining({
        userId: 42,
        purpose: "point",
        contentType: "image/png",
      })
    );
    log.mockRestore();
  });
});
