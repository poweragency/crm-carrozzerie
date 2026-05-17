"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FolderKanban, History, ChevronRight, Archive } from "lucide-react";
import { CASE_STATUS_LABELS, CASE_STATUS_COLORS } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CaseStatus } from "@/types/database.types";

const OPEN_STATUSES: CaseStatus[] = ["preventivo", "attesa_pezzi", "lavorazione"];
const CLOSED_STATUSES: CaseStatus[] = ["completata", "consegnata"];

export interface CustomerCase {
  id: string;
  status: CaseStatus;
  price: number | null;
  insurance_company: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  vehicles: {
    make: string | null;
    model: string | null;
    plate: string | null;
  } | null;
}

type Tab = "open" | "incomplete" | "history";

export function CustomerCasesPanel({ cases }: { cases: CustomerCase[] }) {
  const [tab, setTab] = useState<Tab>("open");

  const { open, incomplete, history } = useMemo(() => {
    const open = cases.filter((c) => !c.archived_at && OPEN_STATUSES.includes(c.status));
    const incomplete = cases
      .filter((c) => !!c.archived_at)
      .sort(
        (a, b) =>
          new Date(b.archived_at as string).getTime() -
          new Date(a.archived_at as string).getTime()
      );
    const history = cases
      .filter((c) => !c.archived_at && CLOSED_STATUSES.includes(c.status))
      .sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    return { open, incomplete, history };
  }, [cases]);

  const list = tab === "open" ? open : tab === "incomplete" ? incomplete : history;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
          <FolderKanban className="w-3.5 h-3.5" />
          Pratiche
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
          <TabButton
            active={tab === "open"}
            onClick={() => setTab("open")}
            icon={<FolderKanban className="w-3 h-3" />}
            label="In corso"
            count={open.length}
          />
          <TabButton
            active={tab === "incomplete"}
            onClick={() => setTab("incomplete")}
            icon={<Archive className="w-3 h-3" />}
            label="Incomplete"
            count={incomplete.length}
            borderLeft
          />
          <TabButton
            active={tab === "history"}
            onClick={() => setTab("history")}
            icon={<History className="w-3 h-3" />}
            label="Passate"
            count={history.length}
            borderLeft
          />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={tab === "open" ? FolderKanban : tab === "incomplete" ? Archive : History}
          title={
            tab === "open"
              ? "Nessuna pratica in corso"
              : tab === "incomplete"
                ? "Nessuna pratica incompleta"
                : "Nessuna pratica passata"
          }
          description={
            tab === "open"
              ? "Le pratiche aperte di questo cliente appariranno qui."
              : tab === "incomplete"
                ? "Le pratiche archiviate (es. dopo l'eliminazione di un lead) appariranno qui e potranno essere riprese."
                : "Lo storico mostra solo pratiche completate o consegnate."
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-border">
            {list.map((c) => {
              const vehStr = c.vehicles
                ? [c.vehicles.make, c.vehicles.model, c.vehicles.plate]
                    .filter(Boolean)
                    .join(" · ")
                : null;
              return (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors",
                    tab === "incomplete" && "opacity-80"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded",
                          CASE_STATUS_COLORS[c.status].bg,
                          CASE_STATUS_COLORS[c.status].text
                        )}
                      >
                        {CASE_STATUS_LABELS[c.status]}
                      </span>
                      {tab === "incomplete" && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 inline-flex items-center gap-1">
                          <Archive className="w-2.5 h-2.5" />
                          Incompleta
                        </span>
                      )}
                      <span className="text-[11px] text-text-subtle">
                        {tab === "history"
                          ? `Chiusa ${formatDate(c.updated_at)}`
                          : tab === "incomplete"
                            ? `Archiviata ${formatDate(c.archived_at as string)}`
                            : `Aperta ${formatDate(c.created_at)}`}
                      </span>
                    </div>
                    <div className="text-sm mt-1 truncate text-text-muted">
                      {vehStr || c.description || "—"}
                    </div>
                    {c.insurance_company && (
                      <div className="text-[11px] text-text-subtle mt-0.5 truncate">
                        Assicurazione: {c.insurance_company}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-medium tabular-nums shrink-0 text-right">
                    {formatCurrency(c.price)}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-text-subtle shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  borderLeft,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  borderLeft?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 transition-colors inline-flex items-center gap-1.5",
        borderLeft && "border-l border-border",
        active
          ? "bg-accent/10 text-accent"
          : "text-text-muted hover:text-text hover:bg-bg-hover"
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "tabular-nums text-[10px] rounded-full px-1.5",
          active ? "bg-accent/20" : "bg-bg-hover text-text-subtle"
        )}
      >
        {count}
      </span>
    </button>
  );
}
