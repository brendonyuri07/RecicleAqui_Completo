const maxImageSize = 8 * 1024 * 1024;
const maxImagePixels = 50_000_000;

type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";

function jpegDimensions(
  image: Buffer
): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 4 < image.length) {
    if (image[offset] !== 0xff) return null;
    while (image[offset] === 0xff) offset += 1;
    const marker = image[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > image.length) return null;

    const segmentLength = image.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > image.length) return null;
    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
        0xcf,
      ].includes(marker)
    ) {
      if (segmentLength < 7) return null;
      return {
        height: image.readUInt16BE(offset + 3),
        width: image.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return null;
}

function imageDimensions(image: Buffer, contentType: SupportedImageType) {
  if (contentType === "image/png") {
    if (
      image.length < 45 ||
      !image
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      image.readUInt32BE(8) !== 13 ||
      image.toString("ascii", 12, 16) !== "IHDR" ||
      image.toString("ascii", image.length - 8, image.length - 4) !== "IEND"
    )
      return null;
    return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
  }

  if (contentType === "image/jpeg") {
    if (
      image.length < 12 ||
      image[0] !== 0xff ||
      image[1] !== 0xd8 ||
      image[image.length - 2] !== 0xff ||
      image[image.length - 1] !== 0xd9
    )
      return null;
    return jpegDimensions(image);
  }

  if (
    image.length < 30 ||
    image.toString("ascii", 0, 4) !== "RIFF" ||
    image.readUInt32LE(4) !== image.length - 8 ||
    image.toString("ascii", 8, 12) !== "WEBP"
  )
    return null;

  const chunk = image.toString("ascii", 12, 16);
  const chunkSize = image.readUInt32LE(16);
  if (chunkSize > image.length - 20) return null;
  if (chunk === "VP8X" && chunkSize >= 10) {
    return {
      width: 1 + image.readUIntLE(24, 3),
      height: 1 + image.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 " && chunkSize >= 10) {
    if (image.toString("ascii", 23, 26) !== "\x9d\x01\x2a") return null;
    return {
      width: image.readUInt16LE(26) & 0x3fff,
      height: image.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && chunkSize >= 5 && image[20] === 0x2f) {
    return {
      width: 1 + image[21] + ((image[22] & 0x3f) << 8),
      height:
        1 + (image[22] >> 6) + (image[23] << 2) + ((image[24] & 0x0f) << 10),
    };
  }
  return null;
}

export function validateUploadedImage(
  image: Buffer,
  contentType: SupportedImageType
): string | null {
  if (image.length === 0) return "O arquivo de imagem está vazio.";
  if (image.length > maxImageSize)
    return "A imagem processada deve ter no máximo 8 MB.";

  const dimensions = imageDimensions(image, contentType);
  if (!dimensions)
    return "O conteúdo do arquivo não corresponde a uma imagem válida.";
  if (
    dimensions.width === 0 ||
    dimensions.height === 0 ||
    dimensions.width > 20_000 ||
    dimensions.height > 20_000 ||
    dimensions.width * dimensions.height > maxImagePixels
  ) {
    return "A imagem excede o limite seguro de 50 megapixels.";
  }
  return null;
}
