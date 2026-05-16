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
  Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils";
import { useConfirm } from "../ConfirmDialog";
import { WorkshopDrawer } from "./WorkshopDrawer";
import { NewWorkshopModal } from "./NewWorkshopModal";

export type Workshop = {
  id: string;
  name: string;
  vat_number: string | null;
  tax_code: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  owner_email: string | null;
  owner_full_name: string | null;
  owner_phone: string | null;
  facebook_connected: boolean;
  members_count: number;
  staff_count: number;
  leads_count: number;
  cases_count: number;
  cases_open_count: number;
  revenue_total: number;
  invoices_count: number;
  documents_count: number;
  registered_at: string;
  last_activity_at: string | null;
};

const AVATAR_COLORS = [
  "bg-status-info/20 text-status-info",
  "bg-status-success/20 text-status-success",
  "bg-chart-5/20 text-chart-5",
  "bg-status-warning/20 text-status-warning",
  "bg-accent/20 text-accent",
];

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
  currentUserWorkshopId: string | null;
  error: string | null;
}

export function WorkshopTable({ initialWorkshops, currentUserWorkshopId, error }: Props) {
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
        w.name.toLowerCase().includes(q) ||
        w.owner_email?.toLowerCase().includes(q) ||
        w.owner_phone?.toLowerCase().includes(q) ||
        w.vat_number?.toLowerCase().includes(q) ||
        w.city?.toLowerCase().includes(q)
    );
  }, [workshops, search]);

  async function handleDelete(w: Workshop) {
    const ok = await confirm({
      title: `Eliminare l'officina "${w.name}"?`,
      description: `Verranno cancellati definitivamente:\n• ${w.members_count} ${w.members_count === 1 ? "membro" : "membri"} (titolare + ${w.staff_count} staff)\n• ${w.leads_count} lead\n• ${w.cases_count} pratiche\n• ${w.invoices_count} preventivi/fatture\n• ${w.documents_count} documenti/foto\n\nAzione irreversibile.`,
      confirmLabel: "Elimina officina",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/workshops/${w.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error("Eliminazione fallita", { description: json?.error });
      return;
    }
    setWorkshops((prev) => prev.filter((x) => x.id !== w.id));
    setSelected(null);
    toast.success("Officina eliminata");
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="card p-6 border-status-danger/30 bg-status-danger/5">
          <h2 className="text-lg font-semibold text-status-danger mb-2">
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
              {workshops.length} officin{workshops.length === 1 ? "a" : "e"} registrat
              {workshops.length === 1 ? "a" : "e"}
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
          <button onClick={() => setShowNew(true)} className="btn-primary" type="button">
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
                  Team
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
                  const avatar =
                    AVATAR_COLORS[w.name.charCodeAt(0) % AVATAR_COLORS.length];
                  const isCurrent = w.id === currentUserWorkshopId;
                  return (
                    <tr
                      key={w.id}
                      onClick={() => setSelected(w)}
                      className={cn(
                        "transition-colors cursor-pointer group border-l-2 border-transparent hover:bg-bg-hover hover:border-l-accent",
                        idx % 2 === 1 && "bg-bg-hover/30"
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
                            {initials(w.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate flex items-center gap-1.5">
                              {w.name}
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
                          {w.owner_email && (
                            <div className="flex items-center gap-1.5 text-xs text-text-muted">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[200px]">
                                {w.owner_email}
                              </span>
                            </div>
                          )}
                          {w.owner_phone && (
                            <div className="flex items-center gap-1.5 text-xs text-text-muted">
                              <Phone className="w-3 h-3" />
                              {w.owner_phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-text-muted">
                          <UsersIcon className="w-3.5 h-3.5" />
                          <span className="tabular-nums">{w.members_count}</span>
                        </span>
                        {w.staff_count > 0 && (
                          <span className="text-[10px] text-text-subtle ml-1">
                            ({w.staff_count} staff)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm tabular-nums">{w.leads_count}</td>
                      <td className="px-5 py-3 text-sm">
                        <span className="tabular-nums">{w.cases_count}</span>
                        {w.cases_open_count > 0 && (
                          <span className="text-[10px] text-status-warning ml-1">
                            ({w.cases_open_count} aperte)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm tabular-nums">
                        {formatCurrency(w.revenue_total)}
                      </td>
                      <td className="px-5 py-3 text-xs text-text-muted">
                        {lastAccess(w.last_activity_at)}
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
          isCurrent={selected.id === currentUserWorkshopId}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      {showNew && (
        <NewWorkshopModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
