"use client";

import {
  Trash2,
  ArrowRight,
  KanbanSquare,
  Users,
  FolderKanban,
  Car,
  Receipt,
  ImageIcon,
  ShieldCheck,
  User,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { CASE_STATUS_LABELS } from "@/lib/constants";
import { EmptyState } from "@/components/ui/EmptyState";
import { History } from "lucide-react";
import type { CaseStatus, UserRole } from "@/types/database.types";

export interface ActivityEntry {
  id: string;
  action: string;
  actor_full_name: string | null;
  actor_role: UserRole | null;
  entity_type: string;
  entity_label: string | null;
  changes: { status?: [string, string] } | null;
  created_at: string;
}

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  lead: KanbanSquare,
  customer: Users,
  case: FolderKanban,
  vehicle: Car,
  invoice: Receipt,
  document: ImageIcon,
};

const ENTITY_LABEL: Record<string, string> = {
  lead: "Lead",
  customer: "Cliente",
  case: "Pratica",
  vehicle: "Veicolo",
  invoice: "Preventivo/Fattura",
  document: "Documento",
};

function actionLabel(e: ActivityEntry): React.ReactNode {
  if (e.action === "delete") {
    return (
      <span className="text-status-danger">
        ha eliminato {ENTITY_LABEL[e.entity_type] ?? e.entity_type}
      </span>
    );
  }
  if (e.action === "status_change" && e.changes?.status) {
    const [from, to] = e.changes.status;
    const label =
      e.entity_type === "case"
        ? `${CASE_STATUS_LABELS[from as CaseStatus] ?? from} → ${CASE_STATUS_LABELS[to as CaseStatus] ?? to}`
        : `${from} → ${to}`;
    return (
      <span className="text-text-muted">
        ha aggiornato stato{" "}
        <span className="inline-flex items-center gap-1 text-text">
          {label.split(" → ")[0]}
          <ArrowRight className="w-3 h-3 text-text-subtle" />
          {label.split(" → ")[1]}
        </span>
      </span>
    );
  }
  return <span className="text-text-muted">{e.action}</span>;
}

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nessuna attività"
        description="Quando un membro del team modifica o elimina dati significativi, l'azione apparirà qui."
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-border">
        {entries.map((e) => {
          const EntityIcon = ENTITY_ICONS[e.entity_type] ?? Trash2;
          const RoleIcon = e.actor_role === "owner" ? ShieldCheck : User;
          const isDelete = e.action === "delete";
          return (
            <div
              key={e.id}
              className="px-5 py-3 flex items-center gap-3 hover:bg-bg-hover transition-colors"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                  isDelete
                    ? "bg-status-danger/10 text-status-danger"
                    : "bg-status-info/10 text-status-info"
                )}
              >
                <EntityIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  <span className="font-medium">
                    {e.actor_full_name || "Sconosciuto"}
                  </span>{" "}
                  {actionLabel(e)}{" "}
                  {e.entity_label && (
                    <span className="font-medium text-text">
                      &ldquo;{e.entity_label}&rdquo;
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {e.actor_role && (
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded inline-flex items-center gap-1",
                        e.actor_role === "owner"
                          ? "bg-accent/10 text-accent"
                          : "bg-status-info/10 text-status-info"
                      )}
                    >
                      <RoleIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
                      {e.actor_role === "owner" ? "Titolare" : "Dipendente"}
                    </span>
                  )}
                  <span className="text-[11px] text-text-subtle">
                    {formatDateTime(e.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
