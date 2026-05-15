"use client";

import { useEffect } from "react";
import {
  X,
  Ban,
  CheckCircle,
  Trash2,
  Mail,
  Phone,
  MapPin,
  CalendarClock,
  FileText,
  ImageIcon,
  Euro,
  Facebook,
  ShieldCheck,
} from "lucide-react";
import { cn, formatCurrency, formatDateTime, initials } from "@/lib/utils";
import type { Workshop } from "./WorkshopTable";

function isDisabled(w: Workshop): boolean {
  if (!w.banned_until) return false;
  return new Date(w.banned_until).getTime() > Date.now();
}

interface Props {
  workshop: Workshop;
  isCurrent: boolean;
  onClose: () => void;
  onDelete: () => void;
  onToggleBan: () => void;
}

export function WorkshopDrawer({
  workshop: w,
  isCurrent,
  onClose,
  onDelete,
  onToggleBan,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const disabled = isDisabled(w);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed top-0 right-0 h-screen w-full sm:w-[420px] bg-bg-card border-l border-border z-50 flex flex-col shadow-xl animate-slide-in-right">
        <div className="px-5 h-16 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-accent/15 text-accent text-[11px] font-semibold flex items-center justify-center shrink-0">
              {initials(w.workshop_name ?? w.email)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                {w.workshop_name ?? "—"}
                {isCurrent && (
                  <span className="text-[9px] bg-accent/20 text-accent px-1 py-0.5 rounded font-bold">
                    TU
                  </span>
                )}
              </div>
              <div className="text-[11px] text-text-subtle truncate">{w.email}</div>
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
          {/* Stato */}
          <div>
            {disabled ? (
              <div className="card p-3 border-red-500/30 bg-red-500/5 flex items-center gap-2 text-red-400 text-sm">
                <Ban className="w-4 h-4 shrink-0" />
                <span>Account disabilitato — non può loggarsi</span>
              </div>
            ) : w.email_confirmed ? (
              <div className="card p-3 border-emerald-500/30 bg-emerald-500/5 flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Account attivo</span>
              </div>
            ) : (
              <div className="card p-3 border-yellow-500/30 bg-yellow-500/5 flex items-center gap-2 text-yellow-400 text-sm">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Email non confermata</span>
              </div>
            )}
          </div>

          {/* Dati registrazione */}
          <Section title="Dati registrazione">
            <Row icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={w.email} />
            {w.phone && (
              <Row
                icon={<Phone className="w-3.5 h-3.5" />}
                label="Telefono"
                value={w.phone}
              />
            )}
            {w.vat_number && (
              <Row label="P.IVA" value={w.vat_number} mono />
            )}
            {w.tax_code && (
              <Row label="Codice fiscale" value={w.tax_code} mono />
            )}
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
              value={w.last_sign_in_at ? formatDateTime(w.last_sign_in_at) : "mai loggato"}
            />
          </Section>

          {/* Statistiche */}
          <Section title="Statistiche (sola lettura)">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Lead totali" value={w.leads_count} />
              <Stat
                label="Pratiche"
                value={w.cases_count}
                hint={w.cases_open_count > 0 ? `${w.cases_open_count} aperte` : undefined}
              />
              <Stat
                label="Fatturato"
                value={formatCurrency(w.revenue_total)}
                icon={<Euro className="w-3 h-3" />}
              />
              <Stat
                label="Preventivi/Fatture"
                value={w.invoices_count}
                icon={<FileText className="w-3 h-3" />}
              />
              <Stat
                label="Documenti caricati"
                value={w.documents_count}
                icon={<ImageIcon className="w-3 h-3" />}
              />
            </div>
          </Section>

          {/* Integrazioni */}
          <Section title="Integrazioni">
            <div className="flex items-center gap-2 text-sm">
              <Facebook className="w-4 h-4 text-blue-400" />
              <span>Facebook Ads</span>
              <span
                className={cn(
                  "ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded",
                  w.facebook_connected
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-bg-hover text-text-subtle"
                )}
              >
                {w.facebook_connected ? "Collegato" : "Non collegato"}
              </span>
            </div>
          </Section>
        </div>

        <div className="px-5 py-3 border-t border-border shrink-0 flex gap-2">
          <button
            onClick={onToggleBan}
            disabled={isCurrent}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 font-medium text-sm px-4 py-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              disabled
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
            )}
            type="button"
            title={isCurrent ? "Non puoi disabilitare il tuo account" : undefined}
          >
            {disabled ? (
              <>
                <CheckCircle className="w-4 h-4" /> Riabilita
              </>
            ) : (
              <>
                <Ban className="w-4 h-4" /> Disabilita
              </>
            )}
          </button>
          <button
            onClick={onDelete}
            disabled={isCurrent}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium text-sm px-4 py-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            type="button"
            title={isCurrent ? "Non puoi eliminare il tuo account" : undefined}
          >
            <Trash2 className="w-4 h-4" /> Elimina
          </button>
        </div>
      </aside>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
      <span
        className={cn("text-text truncate", mono && "font-mono")}
        title={value}
      >
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
      {hint && <div className="text-[10px] text-yellow-400">{hint}</div>}
    </div>
  );
}
