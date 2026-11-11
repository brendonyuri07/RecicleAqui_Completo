import {
  getQuickPointStatus,
  quickStatusLabel,
  type PointStatus,
} from "@/lib/domain";

const styles = {
  disponivel: "bg-[color:var(--success)] text-[color:var(--success)]",
  lotado: "bg-[color:var(--danger)] text-[color:var(--danger)]",
  fechado: "bg-muted-foreground text-muted-foreground",
} as const;

export default function QuickPointStatus({
  capacityStatus,
  openingHours,
}: {
  capacityStatus: PointStatus;
  openingHours: string;
}) {
  const status = getQuickPointStatus(capacityStatus, openingHours);
  const [dot, text] = styles[status].split(" ");

  return (
    <span className={`inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-xs font-medium ${text}`}>
      <span className={`status-dot ${dot}`} />
      {quickStatusLabel[status]}
    </span>
  );
}