"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Mail,
  Phone,
  ChevronRight,
  ShieldCheck,
  Ban,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils";
import { useConfirm } from "../ConfirmDialog";
import { WorkshopDrawer } from "./WorkshopDrawer";
import { NewWorkshopModal } from "./NewWorkshopModal";

export type Workshop = {
  id: string;
  email: string;
  workshop_name: string | null;
  phone: string | null;
  vat_number: string | null;
  tax_code: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  facebook_connected: boolean;
  registered_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  email_confirmed: boolean;
  leads_count: number;
  cases_count: number;
  cases_open_count: number;
  revenue_total: number;
  invoices_count: number;
  documents_count: number;
};

const AVATAR_COLORS = [
  "bg-blue-500/20 text-blue-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-purple-500/20 text-purple-300",
  "bg-yellow-500/20 text-yellow-300",
  "bg-pink-500/20 text-pink-300",
  "bg-cyan-500/20 text-cyan-300",
  "bg-orange-500/20 text-orange-300",
  "bg-red-500/20 text-red-300",
];

function isDisabled(w: Workshop): boolean {
  if (!w.banned_until) return false;
  return new Date(w.banned_until).getTime() > Date.now();
}

function lastAccess(iso: string | null): string {
  if (!iso) return "mai loggato";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "ora";
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}g fa`;
  return formatDate(iso);
}

interface Props {
  initialWorkshops: Workshop[];
  currentUserId: string;
  error: string | null;
}

export function WorkshopTable({ initialWorkshops, currentUserId, error }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [workshops, setWorkshops] = useState<Workshop[]>(initialWorkshops);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Workshop | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return workshops;
    const q = search.toLowerCase();
    return workshops.filter(
      (w) =>
        w.workshop_name?.toLowerCase().includes(q) ||
        w.email.toLowerCase().includes(q) ||
        w.phone?.toLowerCase().includes(q) ||
        w.vat_number?.toLowerCase().includes(q) ||
        w.city?.toLowerCase().includes(q)
    );
  }, [workshops, search]);

  const activeCount = workshops.filter((w) => !isDisabled(w)).length;

  async function handleDelete(w: Workshop) {
    const ok = await confirm({
      title: `Eliminare l'officina "${w.workshop_name ?? w.email}"?`,
      description: `Verranno cancellati definitivamente:\n• Account ${w.email}\n• ${w.leads_count} lead\n• ${w.cases_count} pratiche\n• ${w.invoices_count} preventivi/fatture\n• ${w.documents_count} documenti/foto\n\nAzione irreversibile.`,
      confirmLabel: "Elimina officina",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${w.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error("Eliminazione fallita", { description: json?.error });
      return;
    }
    setWorkshops((prev) => prev.filter((x) => x.id !== w.id));
    setSelected(null);
    toast.success("Officina eliminata");
  }

  async function handleToggleBan(w: Workshop) {
    const disabled = isDisabled(w);
    const action = disabled ? "enable" : "disable";
    const ok = await confirm({
      title: disabled
        ? `Riabilitare "${w.workshop_name ?? w.email}"?`
        : `Disabilitare "${w.workshop_name ?? w.email}"?`,
      description: disabled
        ? "L'officina potrà tornare ad accedere immediatamente."
        : "L'officina non potrà più loggarsi finché non la riabiliti. I dati restano salvati.",
      confirmLabel: disabled ? "Riabilita" : "Disabilita",
      variant: disabled ? "primary" : "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${w.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error("Operazione fallita", { description: json?.error });
      return;
    }
    toast.success(disabled ? "Officina riabilitata" : "Officina disabilitata");
    router.refresh();
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="card p-6 border-red-500/30 bg-red-500/5">
          <h2 className="text-lg font-semibold text-red-400 mb-2">
            Errore caricamento
          </h2>
          <p className="text-sm text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-8 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent/15 text-accent flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Admin · Officine</h1>
            <p className="text-xs text-text-subtle">
              {workshops.length} registrate · {activeCount} attive
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca nome, email, P.IVA..."
              className="input-base pl-8 w-64"
            />
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="btn-primary"
            type="button"
          >
            <Plus className="w-4 h-4" /> Nuova officina
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-hover/50">
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Officina
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Contatti
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Lead
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Pratiche
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Fatturato
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Stato
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Ultimo accesso
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-sm text-text-subtle py-10">
                    {workshops.length === 0
                      ? "Nessuna officina registrata."
                      : "Nessun risultato."}
                  </td>
                </tr>
              ) : (
                filtered.map((w, idx) => {
                  const disabled = isDisabled(w);
                  const avatar = AVATAR_COLORS[
                    (w.workshop_name ?? w.email).charCodeAt(0) % AVATAR_COLORS.length
                  ];
                  const isCurrent = w.id === currentUserId;
                  return (
                    <tr
                      key={w.id}
                      onClick={() => setSelected(w)}
                      className={cn(
                        "transition-colors cursor-pointer group border-l-2 border-transparent hover:bg-bg-hover hover:border-l-accent",
                        idx % 2 === 1 && "bg-bg-hover/30",
                        disabled && "opacity-60"
                      )}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ring-2 ring-transparent group-hover:ring-accent/30 transition-all",
                              avatar
                            )}
                          >
                            {initials(w.workshop_name ?? w.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate flex items-center gap-1.5">
                              {w.workshop_name ?? "—"}
                              {isCurrent && (
                                <span className="text-[9px] bg-accent/20 text-accent px-1 py-0.5 rounded font-bold">
                                  TU
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-text-subtle truncate">
                              {w.vat_number ? `P.IVA ${w.vat_number}` : "P.IVA mancante"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{w.email}</span>
                          </div>
                          {w.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-text-muted">
                              <Phone className="w-3 h-3" />
                              {w.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm tabular-nums">
                        {w.leads_count}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        <span className="tabular-nums">{w.cases_count}</span>
                        {w.cases_open_count > 0 && (
                          <span className="text-[10px] text-yellow-400 ml-1">
                            ({w.cases_open_count} aperte)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm tabular-nums">
                        {formatCurrency(w.revenue_total)}
                      </td>
                      <td className="px-5 py-3">
                        {disabled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/40">
                            <Ban className="w-3 h-3" /> Disabilitata
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/40">
                            <CheckCircle className="w-3 h-3" /> Attiva
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-text-muted">
                        {lastAccess(w.last_sign_in_at)}
                      </td>
                      <td className="px-3 py-3 text-text-subtle group-hover:text-text">
                        <ChevronRight className="w-4 h-4" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <WorkshopDrawer
          workshop={selected}
          isCurrent={selected.id === currentUserId}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected)}
          onToggleBan={() => handleToggleBan(selected)}
        />
      )}

      {showNew && (
        <NewWorkshopModal
          onClose={() => setShowNew(false)}
          onCreated={(w) => {
            setWorkshops((prev) => [w, ...prev]);
            setShowNew(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
