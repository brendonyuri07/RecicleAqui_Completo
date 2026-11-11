import { describe, expect, it } from "vitest";
import { validateUploadedImage } from "./imageValidation";

function png(width: number, height: number) {
  const image = Buffer.alloc(45);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(image);
  image.writeUInt32BE(13, 8);
  image.write("IHDR", 12);
  image.writeUInt32BE(width, 16);
  image.writeUInt32BE(height, 20);
  image.write("IEND", 37);
  return image;
}

function jpeg(width: number, height: number) {
  const image = Buffer.alloc(23);
  image.set([0xff, 0xd8, 0xff, 0xc0], 0);
  image.writeUInt16BE(17, 4);
  image[6] = 8;
  image.writeUInt16BE(height, 7);
  image.writeUInt16BE(width, 9);
  image.set([0xff, 0xd9], 21);
  return image;
}

function webp(width: number, height: number) {
  const image = Buffer.alloc(30);
  image.write("RIFF", 0);
  image.writeUInt32LE(22, 4);
  image.write("WEBP", 8);
  image.write("VP8X", 12);
  image.writeUInt32LE(10, 16);
  image.writeUIntLE(width - 1, 24, 3);
  image.writeUIntLE(height - 1, 27, 3);
  return image;
}

describe("uploaded image validation", () => {
  it.each([
    [png(1200, 800), "image/png"],
    [jpeg(1200, 800), "image/jpeg"],
    [webp(1200, 800), "image/webp"],
  ] as const)("accepts a structurally valid %s image", (image, contentType) => {
    expect(validateUploadedImage(image, contentType)).toBeNull();
  });

  it("rejects a declared type that does not match the file content", () => {
    expect(validateUploadedImage(png(100, 100), "image/jpeg")).toContain(
      "não corresponde"
    );
  });

  it("rejects files that exceed the processed upload limit", () => {
    expect(
      validateUploadedImage(Buffer.alloc(8 * 1024 * 1024 + 1), "image/png")
    ).toContain("8 MB");
  });

  it("rejects images with unsafe dimensions", () => {
    expect(validateUploadedImage(png(10_000, 10_000), "image/png")).toContain(
      "50 megapixels"
    );
  });
});
