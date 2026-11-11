const maxSourceSize = 40 * 1024 * 1024;
const maxOutputSize = 8 * 1024 * 1024;
const maxDimension = 2560;
const maxPixels = 50_000_000;

const inputTypes: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/avif": "avif",
};

function ascii(bytes: Uint8Array, start: number, end: number) {
  let value = "";
  for (let index = start; index < end; index += 1) {
    value += String.fromCharCode(bytes[index]);
  }
  return value;
}

function detectImageFormat(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpeg";
  if (bytes.subarray(0, 8).join(",") === "137,80,78,71,13,10,26,10")
    return "png";
  if (ascii(bytes, 0, 6).match(/^GIF8[79]a$/)) return "gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP")
    return "webp";
  if (ascii(bytes, 0, 2) === "BM") return "bmp";
  if (
    ascii(bytes, 4, 8) === "ftyp" &&
    /^(avif|avis)$/.test(ascii(bytes, 8, 12))
  )
    return "avif";
  return null;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob =>
        blob
          ? resolve(blob)
          : reject(new Error("Não foi possível processar esta imagem.")),
      type,
      quality
    );
  });
}

export async function prepareImage(file: File): Promise<File> {
  if (file.size === 0) throw new Error("O arquivo selecionado está vazio.");
  if (file.size > maxSourceSize)
    throw new Error("A imagem original deve ter no máximo 40 MB.");

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const format = detectImageFormat(bytes);
  if (!format || (file.type && inputTypes[file.type] !== format)) {
    throw new Error(
      "Formato de imagem não suportado ou conteúdo inválido. Use JPG, PNG, WebP, GIF, BMP ou AVIF."
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "Não foi possível abrir esta imagem. Verifique se o arquivo não está corrompido."
    );
  }

  try {
    if (
      bitmap.width === 0 ||
      bitmap.height === 0 ||
      bitmap.width * bitmap.height > maxPixels
    ) {
      throw new Error("A imagem excede o limite seguro de 50 megapixels.");
    }

    let width = bitmap.width;
    let height = bitmap.height;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Não foi possível preparar esta imagem no navegador.");

      context.drawImage(bitmap, 0, 0, width, height);
      let blob = await canvasBlob(canvas, "image/webp", 0.84);
      if (blob.type !== "image/webp") {
        const fallbackType =
          format === "png" ||
          format === "gif" ||
          format === "webp" ||
          format === "bmp" ||
          format === "avif"
            ? "image/png"
            : "image/jpeg";
        blob = await canvasBlob(
          canvas,
          fallbackType,
          fallbackType === "image/jpeg" ? 0.84 : undefined
        );
      }

      if (
        blob.size <= maxOutputSize &&
        (blob.type === "image/jpeg" ||
          blob.type === "image/png" ||
          blob.type === "image/webp")
      ) {
        return new File(
          [blob],
          `recicle-aqui.${blob.type === "image/jpeg" ? "jpg" : blob.type.slice(6)}`,
          {
            type: blob.type,
            lastModified: Date.now(),
          }
        );
      }

      width = Math.max(1, Math.floor(width * 0.8));
      height = Math.max(1, Math.floor(height * 0.8));
    }
    throw new Error("Não foi possível reduzir a imagem abaixo de 8 MB.");
  } finally {
    bitmap.close();
  }
}
