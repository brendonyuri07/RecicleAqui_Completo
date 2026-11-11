import { ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { prepareImage } from "@/lib/imageUpload";
import { trpc } from "@/lib/trpc";

export default function ImageUpload({
  value,
  onChange,
  purpose,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  purpose: "point" | "avatar";
  label: string;
}) {
  const inputId = useId();
  const [error, setError] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const selectionId = useRef(0);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const upload = trpc.media.uploadImage.useMutation({
    onSuccess: ({ url }) => {
      onChange(url);
      setPendingImage(null);
      setPreviewUrl("");
      setError("");
    },
  });

  const selectImage = async (file?: File) => {
    setError("");
    if (!file) return;
    upload.reset();
    const currentSelection = ++selectionId.current;
    setPendingImage(null);
    setPreviewUrl("");
    setIsProcessing(true);
    try {
      const processed = await prepareImage(file);
      if (currentSelection !== selectionId.current) return;
      setPendingImage(processed);
      setPreviewUrl(URL.createObjectURL(processed));
    } catch (cause) {
      if (currentSelection === selectionId.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível processar esta imagem."
        );
      }
    } finally {
      if (currentSelection === selectionId.current) setIsProcessing(false);
    }
  };

  const sendImage = async () => {
    if (!pendingImage) return;
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === "string" ? result.split(",", 2)[1] : "";
      if (!base64) {
        setError("Não foi possível ler a imagem preparada.");
        return;
      }
      const contentType = pendingImage.type;
      if (
        contentType !== "image/jpeg" &&
        contentType !== "image/png" &&
        contentType !== "image/webp"
      ) {
        setError("O formato processado não é compatível com o envio.");
        return;
      }
      upload.mutate({
        base64,
        contentType,
        purpose,
      });
    };
    reader.onerror = () => setError("Não foi possível ler a imagem preparada.");
    reader.readAsDataURL(pendingImage);
  };

  const displayedImage = previewUrl || value;
  const isBusy = isProcessing || upload.isPending;
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
          {displayedImage ? (
            <img
              src={displayedImage}
              alt="Pré-visualização"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label
            htmlFor={inputId}
            className="btn-outline relative cursor-pointer"
            aria-disabled={isBusy}
          >
            {isBusy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {isProcessing
              ? "Preparando…"
              : upload.isPending
                ? "Enviando…"
                : value || pendingImage
                  ? "Trocar imagem"
                  : "Escolher imagem"}
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={isBusy}
              onChange={event => {
                void selectImage(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {pendingImage && !upload.isPending && (
            <button
              type="button"
              className="btn-primary !px-3"
              onClick={sendImage}
            >
              <Upload className="h-4 w-4" />
              Enviar foto
            </button>
          )}
          {(value || pendingImage) && !upload.isPending && !isProcessing && (
            <button
              type="button"
              className="btn-outline !px-2.5"
              aria-label="Remover imagem selecionada"
              onClick={() => {
                selectionId.current += 1;
                upload.reset();
                setPendingImage(null);
                setPreviewUrl("");
                if (!pendingImage) onChange("");
                setError("");
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            JPG, PNG, WebP, GIF, BMP ou AVIF · até 40 MB (reduzida para até 8
            MB)
          </span>
        </div>
      </div>
      {upload.isSuccess && !pendingImage && (
        <p role="status" className="mt-2 text-xs text-primary">
          Imagem enviada com sucesso.
        </p>
      )}
      {(error || upload.error) && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error || upload.error?.message}
        </p>
      )}
    </div>
  );
}
