"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck, User, Trash2, Mail, Clock, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateTime, initials } from "@/lib/utils";
import { useConfirm } from "./ConfirmDialog";
import { EmptyState } from "./ui/EmptyState";
import { CreateStaffModal } from "./team/CreateStaffModal";
import { ResetStaffPasswordModal } from "./team/ResetStaffPasswordModal";
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

export function TeamView({ members }: { members: TeamMember[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [showNew, setShowNew] = useState(false);
  const [resetTarget, setResetTarget] = useState<TeamMember | null>(null);
  const [list, setList] = useState<TeamMember[]>(members);

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

  const owners = list.filter((m) => m.role === "owner");
  const staff = list.filter((m) => m.role === "staff");

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Team</h1>
          <p className="text-xs text-text-subtle">
            {list.length} membr{list.length === 1 ? "o" : "i"} · {owners.length} titolar
            {owners.length === 1 ? "e" : "i"} · {staff.length} dipendent
            {staff.length === 1 ? "e" : "i"}
          </p>
        </div>
        <div className="ml-auto">
          <button type="button" onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Aggiungi dipendente
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
        <div className="space-y-6">
          <Section
            title="Titolare"
            description="Accesso completo: dati fiscali, Facebook Ads, fatturato, gestione team."
            members={owners}
            onDelete={handleDelete}
            onReset={setResetTarget}
          />
          <Section
            title="Dipendenti"
            description="Accesso operativo: lead, clienti, pratiche, calendario. Non vedono dati fiscali, fatturato o Facebook Ads."
            members={staff}
            emptyHint="Nessun dipendente. Aggiungine uno per dargli accesso al gestionale."
            onDelete={handleDelete}
            onReset={setResetTarget}
          />
        </div>
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
}: {
  title: string;
  description: string;
  members: TeamMember[];
  emptyHint?: string;
  onDelete: (m: TeamMember) => void;
  onReset: (m: TeamMember) => void;
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
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded inline-flex items-center gap-1",
                        m.role === "owner"
                          ? "bg-accent/10 text-accent"
                          : "bg-status-info/10 text-status-info"
                      )}
                    >
                      <Icon className="w-3 h-3" strokeWidth={2.5} />
                      {m.role === "owner" ? "Titolare" : "Dipendente"}
                    </span>
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
                {m.role === "staff" && !m.is_me && (
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
