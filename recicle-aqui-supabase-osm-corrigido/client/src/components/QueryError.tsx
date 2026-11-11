import { AlertCircle, RotateCcw } from "lucide-react";

export default function QueryError({
  title = "Não foi possível carregar os dados",
  retry,
  compact = false,
}: {
  title?: string;
  retry: () => void;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={
        compact
          ? "rounded-xl border border-border bg-muted/40 p-4"
          : "mx-auto max-w-xl px-6 py-12 text-center"
      }
    >
      <AlertCircle
        className={
          compact
            ? "mb-3 h-5 w-5 text-warning"
            : "mx-auto mb-3 h-8 w-8 text-warning"
        }
      />
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        O serviço está indisponível no momento. Tente novamente em instantes.
      </p>
      <button type="button" className="btn-outline mt-4" onClick={retry}>
        <RotateCcw className="h-4 w-4" /> Tentar novamente
      </button>
    </div>
  );
}
