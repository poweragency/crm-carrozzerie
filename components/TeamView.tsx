"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ShieldCheck,
  User,
  Trash2,
  Mail,
  Clock,
  KeyRound,
  Users as UsersIcon,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateTime, initials } from "@/lib/utils";
import { useConfirm } from "./ConfirmDialog";
import { EmptyState } from "./ui/EmptyState";
import { CreateStaffModal } from "./team/CreateStaffModal";
import { ResetStaffPasswordModal } from "./team/ResetStaffPasswordModal";
import { ActivityFeed, type ActivityEntry } from "./team/ActivityFeed";
import {
  EMPLOYEE_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  isEmployeeRole,
  type EmployeeRole,
} from "@/lib/roles";
import type { UserRole } from "@/types/database.types";

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
  is_me: boolean;
}

type Tab = "members" | "activity";

export function TeamView({
  members,
  activity,
}: {
  members: TeamMember[];
  activity: ActivityEntry[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [showNew, setShowNew] = useState(false);
  const [resetTarget, setResetTarget] = useState<TeamMember | null>(null);
  const [list, setList] = useState<TeamMember[]>(members);
  const [tab, setTab] = useState<Tab>("members");

  async function handleDelete(m: TeamMember) {
    const ok = await confirm({
      title: `Rimuovere "${m.full_name || m.email}"?`,
      description:
        "L'account del dipendente verrà eliminato e non potrà più accedere al CRM. I dati operativi del workshop (lead, clienti, pratiche) restano intatti.",
      confirmLabel: "Rimuovi dipendente",
      variant: "danger",
    });
    if (!ok) return;

    const res = await fetch(`/api/team/users/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error("Rimozione fallita", { description: json?.error });
      return;
    }
    setList((prev) => prev.filter((x) => x.id !== m.id));
    toast.success("Dipendente rimosso");
  }

  async function handleRoleChange(m: TeamMember, newRole: EmployeeRole) {
    if (m.role === newRole) return;
    const prevRole = m.role;
    // Aggiornamento ottimistico
    setList((prev) => prev.map((x) => (x.id === m.id ? { ...x, role: newRole } : x)));
    const res = await fetch(`/api/team/users/${m.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error("Cambio mansione fallito", { description: json?.error });
      setList((prev) => prev.map((x) => (x.id === m.id ? { ...x, role: prevRole } : x)));
      return;
    }
    toast.success(`Mansione aggiornata: ${ROLE_LABELS[newRole]}`);
  }

  const owners = list.filter((m) => m.role === "owner");
  const employees = list.filter((m) => isEmployeeRole(m.role));

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Team</h1>
          <p className="text-xs text-text-subtle">
            {list.length} membr{list.length === 1 ? "o" : "i"} · {owners.length} titolar
            {owners.length === 1 ? "e" : "i"} · {employees.length} dipendent
            {employees.length === 1 ? "e" : "i"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setTab("members")}
              className={cn(
                "px-3 py-1.5 transition-colors inline-flex items-center gap-1.5",
                tab === "members"
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:text-text hover:bg-bg-hover"
              )}
            >
              <UsersIcon className="w-3 h-3" />
              Membri
            </button>
            <button
              type="button"
              onClick={() => setTab("activity")}
              className={cn(
                "px-3 py-1.5 transition-colors inline-flex items-center gap-1.5 border-l border-border",
                tab === "activity"
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:text-text hover:bg-bg-hover"
              )}
            >
              <History className="w-3 h-3" />
              Attività
              {activity.length > 0 && (
                <span
                  className={cn(
                    "tabular-nums text-[10px] rounded-full px-1.5",
                    tab === "activity" ? "bg-accent/20" : "bg-bg-hover text-text-subtle"
                  )}
                >
                  {activity.length}
                </span>
              )}
            </button>
          </div>
          {tab === "members" && (
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Aggiungi dipendente
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
        {tab === "members" ? (
          <div className="space-y-6">
            <Section
              title="Titolare"
              description="Accesso completo: dati fiscali, Facebook Ads, fatturato, gestione team."
              members={owners}
              onDelete={handleDelete}
              onReset={setResetTarget}
              onRoleChange={handleRoleChange}
            />
            {EMPLOYEE_ROLES.map((r) => (
              <Section
                key={r}
                title={`${ROLE_LABELS[r].slice(0, -1)}i`}
                description={ROLE_DESCRIPTIONS[r]}
                members={employees.filter((m) => m.role === r)}
                emptyHint={`Nessun ${ROLE_LABELS[r].toLowerCase()}. Aggiungi un dipendente con questa mansione.`}
                onDelete={handleDelete}
                onReset={setResetTarget}
                onRoleChange={handleRoleChange}
              />
            ))}
          </div>
        ) : (
          <ActivityFeed entries={activity} />
        )}
      </div>

      {showNew && (
        <CreateStaffModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            router.refresh();
          }}
        />
      )}

      {resetTarget && (
        <ResetStaffPasswordModal
          staffId={resetTarget.id}
          staffName={resetTarget.full_name || resetTarget.email}
          staffEmail={resetTarget.email}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}

function Section({
  title,
  description,
  members,
  emptyHint,
  onDelete,
  onReset,
  onRoleChange,
}: {
  title: string;
  description: string;
  members: TeamMember[];
  emptyHint?: string;
  onDelete: (m: TeamMember) => void;
  onReset: (m: TeamMember) => void;
  onRoleChange: (m: TeamMember, role: EmployeeRole) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-text-subtle mt-0.5">{description}</p>
      </div>
      {members.length === 0 ? (
        emptyHint ? (
          <EmptyState icon={User} title="Nessun dipendente" description={emptyHint} />
        ) : null
      ) : (
        <div className="divide-y divide-border">
          {members.map((m) => {
            const Icon = m.role === "owner" ? ShieldCheck : User;
            return (
              <div
                key={m.id}
                className="px-5 py-3 flex items-center gap-4 hover:bg-bg-hover transition-colors"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full text-xs font-semibold flex items-center justify-center shrink-0",
                    m.role === "owner"
                      ? "bg-accent/15 text-accent"
                      : "bg-status-info/15 text-status-info"
                  )}
                >
                  {initials(m.full_name || m.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {m.full_name || "Senza nome"}
                    </span>
                    {m.is_me && (
                      <span className="text-[10px] uppercase tracking-wide bg-bg-hover text-text-muted px-1.5 py-0.5 rounded">
                        Tu
                      </span>
                    )}
                    {m.role === "owner" ? (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded inline-flex items-center gap-1 bg-accent/10 text-accent">
                        <Icon className="w-3 h-3" strokeWidth={2.5} />
                        Titolare
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => onRoleChange(m, e.target.value as EmployeeRole)}
                        className="text-[11px] rounded border border-border bg-bg-input px-1.5 py-0.5 text-text-muted hover:border-border-hover focus:border-accent focus:outline-none"
                        title="Cambia mansione"
                        aria-label="Cambia mansione"
                      >
                        {EMPLOYEE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-text-subtle mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {m.email}
                    </span>
                    {m.last_sign_in_at && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Ultimo accesso {formatDateTime(m.last_sign_in_at)}
                      </span>
                    )}
                  </div>
                </div>
                {isEmployeeRole(m.role) && !m.is_me && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onReset(m)}
                      className="p-2 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                      title="Resetta password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(m)}
                      className="p-2 rounded-md text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors"
                      title="Rimuovi dipendente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
