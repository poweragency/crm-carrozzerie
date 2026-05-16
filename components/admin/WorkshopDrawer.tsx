"use client";

import { useEffect, useState } from "react";
import {
  X,
  Trash2,
  Mail,
  Phone,
  MapPin,
  CalendarClock,
  FileText,
  ImageIcon,
  Euro,
  Facebook,
  Users as UsersIcon,
  ShieldCheck,
  User,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency, formatDateTime, initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Workshop } from "./WorkshopTable";
import type { UserRole } from "@/types/database.types";

interface Member {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  email_confirmed: boolean;
}

interface Props {
  workshop: Workshop;
  isCurrent: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export function WorkshopDrawer({ workshop: w, isCurrent, onClose, onDelete }: Props) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("admin_get_workshop_members", {
        p_workshop_id: w.id,
      });
      if (cancelled) return;
      if (!error && data) setMembers(data as Member[]);
      setLoadingMembers(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [w.id]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed top-0 right-0 h-screen w-full sm:w-[460px] bg-bg-card border-l border-border z-50 flex flex-col shadow-xl animate-slide-in-right">
        <div className="px-5 h-16 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-accent/15 text-accent text-[11px] font-semibold flex items-center justify-center shrink-0">
              {initials(w.name)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                {w.name}
                {isCurrent && (
                  <span className="text-[9px] bg-accent/20 text-accent px-1 py-0.5 rounded font-bold">
                    TU
                  </span>
                )}
              </div>
              <div className="text-[11px] text-text-subtle truncate">
                {w.owner_email ?? "—"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -m-1 text-text-muted hover:text-text"
            aria-label="Chiudi"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Dati registrazione */}
          <Section title="Dati registrazione">
            {w.owner_email && (
              <Row
                icon={<Mail className="w-3.5 h-3.5" />}
                label="Email titolare"
                value={w.owner_email}
              />
            )}
            {w.owner_phone && (
              <Row
                icon={<Phone className="w-3.5 h-3.5" />}
                label="Telefono"
                value={w.owner_phone}
              />
            )}
            {w.vat_number && <Row label="P.IVA" value={w.vat_number} mono />}
            {w.tax_code && <Row label="Codice fiscale" value={w.tax_code} mono />}
            {(w.address || w.city) && (
              <Row
                icon={<MapPin className="w-3.5 h-3.5" />}
                label="Sede"
                value={[
                  w.address,
                  [w.postal_code, w.city, w.province].filter(Boolean).join(" "),
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
            )}
            <Row
              icon={<CalendarClock className="w-3.5 h-3.5" />}
              label="Registrata"
              value={formatDateTime(w.registered_at)}
            />
            <Row
              icon={<CalendarClock className="w-3.5 h-3.5" />}
              label="Ultimo accesso"
              value={
                w.last_activity_at ? formatDateTime(w.last_activity_at) : "mai loggato"
              }
            />
          </Section>

          {/* Team / Membri */}
          <Section
            title={`Team (${w.members_count}${w.staff_count > 0 ? ` — ${w.staff_count} staff` : ""})`}
          >
            {loadingMembers ? (
              <div className="flex items-center gap-2 text-xs text-text-subtle py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Caricamento membri…
              </div>
            ) : !members || members.length === 0 ? (
              <div className="text-xs text-text-subtle py-2">Nessun membro</div>
            ) : (
              <div className="space-y-1.5">
                {members.map((m) => {
                  const Icon = m.role === "owner" ? ShieldCheck : User;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-md bg-bg-hover/30 border border-border"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0",
                          m.role === "owner"
                            ? "bg-accent/15 text-accent"
                            : "bg-status-info/15 text-status-info"
                        )}
                      >
                        {initials(m.full_name || m.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium truncate">
                            {m.full_name || "Senza nome"}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] uppercase tracking-wide px-1 py-0.5 rounded inline-flex items-center gap-0.5",
                              m.role === "owner"
                                ? "bg-accent/10 text-accent"
                                : "bg-status-info/10 text-status-info"
                            )}
                          >
                            <Icon className="w-2.5 h-2.5" strokeWidth={2.5} />
                            {m.role === "owner" ? "Titolare" : "Dipendente"}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-subtle truncate">
                          {m.email}
                        </div>
                        <div className="text-[10px] text-text-subtle">
                          {m.last_sign_in_at
                            ? `Ultimo accesso ${formatDateTime(m.last_sign_in_at)}`
                            : "Mai loggato"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Statistiche */}
          <Section title="Statistiche">
            <div className="grid grid-cols-2 gap-2">
              <Stat
                icon={<UsersIcon className="w-3 h-3" />}
                label="Lead totali"
                value={w.leads_count}
              />
              <Stat
                label="Pratiche"
                value={w.cases_count}
                hint={w.cases_open_count > 0 ? `${w.cases_open_count} aperte` : undefined}
              />
              <Stat
                icon={<Euro className="w-3 h-3" />}
                label="Fatturato"
                value={formatCurrency(w.revenue_total)}
              />
              <Stat
                icon={<FileText className="w-3 h-3" />}
                label="Preventivi/Fatture"
                value={w.invoices_count}
              />
              <Stat
                icon={<ImageIcon className="w-3 h-3" />}
                label="Documenti caricati"
                value={w.documents_count}
              />
            </div>
          </Section>

          {/* Integrazioni */}
          <Section title="Integrazioni">
            <div className="flex items-center gap-2 text-sm">
              <Facebook className="w-4 h-4 text-status-info" />
              <span>Facebook Ads</span>
              <span
                className={cn(
                  "ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded",
                  w.facebook_connected
                    ? "bg-status-success/15 text-status-success"
                    : "bg-bg-hover text-text-subtle"
                )}
              >
                {w.facebook_connected ? "Collegato" : "Non collegato"}
              </span>
            </div>
          </Section>
        </div>

        <div className="px-5 py-3 border-t border-border shrink-0">
          <button
            onClick={onDelete}
            disabled={isCurrent}
            className="w-full inline-flex items-center justify-center gap-2 bg-status-danger/20 hover:bg-status-danger/30 text-status-danger font-medium text-sm px-4 py-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            type="button"
            title={isCurrent ? "Non puoi eliminare il tuo workshop" : undefined}
          >
            <Trash2 className="w-4 h-4" /> Elimina officina
          </button>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wide text-text-subtle font-semibold mb-2">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && <span className="text-text-subtle mt-0.5 shrink-0">{icon}</span>}
      <span className="text-text-muted text-xs min-w-[100px] shrink-0">{label}</span>
      <span className={cn("text-text truncate", mono && "font-mono")} title={value}>
        {value}
      </span>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="card p-3 bg-bg-hover/30">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-text-subtle">
        {icon}
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums mt-1">{value}</div>
      {hint && <div className="text-[10px] text-status-warning">{hint}</div>}
    </div>
  );
}
