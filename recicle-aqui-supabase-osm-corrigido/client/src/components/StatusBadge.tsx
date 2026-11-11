import type { PointStatus } from "@/lib/domain";
import { statusLabel } from "@/lib/domain";

export default function StatusBadge({ status }: { status: PointStatus }) {
  const colors: Record<PointStatus, { dot: string; text: string }> = {
    ativo: { dot: "bg-[color:var(--success)]", text: "text-[color:var(--success)]" },
    proximo: { dot: "bg-[color:var(--warning)]", text: "text-[color:var(--warning)]" },
    lotado: { dot: "bg-[color:var(--danger)]", text: "text-[color:var(--danger)]" },
  };
  const color = colors[status];
  return <span className={`inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-xs font-medium ${color.text}`}><span className={`status-dot ${color.dot}`} />{statusLabel[status]}</span>;
}
