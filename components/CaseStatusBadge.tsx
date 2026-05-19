import { CASE_STATUS_COLORS, CASE_STATUS_LABELS } from "@/lib/constants";
import type { CaseStatus } from "@/types/database.types";
import { cn } from "@/lib/utils";

const RING_COLORS: Record<CaseStatus, string> = {
  preparazione: "ring-purple-500/40",
  verniciatura: "ring-yellow-500/40",
  finitura: "ring-blue-500/40",
  completata: "ring-emerald-500/40",
  consegnata: "ring-accent/40",
  liquidato: "ring-cyan-500/40",
};

const DOT_COLORS: Record<CaseStatus, string> = {
  preparazione: "bg-purple-400",
  verniciatura: "bg-yellow-400",
  finitura: "bg-blue-400",
  completata: "bg-emerald-400",
  consegnata: "bg-accent",
  liquidato: "bg-cyan-400",
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const c = CASE_STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1",
        c.bg,
        c.text,
        RING_COLORS[status]
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", DOT_COLORS[status])} />
      {CASE_STATUS_LABELS[status]}
    </span>
  );
}
