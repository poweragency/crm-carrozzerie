"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Phone,
  Mail,
  Car,
  FolderKanban,
  Users,
  Plus,
  Upload,
} from "lucide-react";
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { CustomerFormModal } from "@/components/customer/CustomerFormModal";
import type { CustomerRow } from "@/app/(app)/customers/page";

const AVATAR_COLORS = [
  "bg-status-info/20 text-status-info",
  "bg-status-success/20 text-status-success",
  "bg-chart-5/20 text-chart-5",
  "bg-status-warning/20 text-status-warning",
  "bg-accent/20 text-accent",
];

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Clienti</h1>
          <p className="text-xs text-text-subtle">
            {rows.length} client{rows.length === 1 ? "e" : "i"} in archivio
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search
              className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 -translate-y-1/2"
              strokeWidth={2}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca cliente, telefono, email..."
              className="input-base pl-8 w-72"
            />
          </div>
          <button
            type="button"
            onClick={() => router.push("/customers/importa")}
            className="btn-secondary"
          >
            <Upload className="w-4 h-4" strokeWidth={2.5} />
            Importa Excel
          </button>
          <button type="button" onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuovo cliente
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nessun cliente ancora"
            description="I clienti vengono creati automaticamente quando un lead viene spostato nella colonna 'Cliente' del Kanban."
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg-hover/50">
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                    Cliente
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                    Contatti
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                    Vetture
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                    Pratiche
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                    Fatturato
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                    Ultima attività
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center text-sm text-text-subtle py-10"
                    >
                      Nessun risultato.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, idx) => {
                    const avatarColor =
                      AVATAR_COLORS[
                        (c.full_name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
                      ];
                    return (
                      <tr
                        key={c.id}
                        onClick={() => router.push(`/customers/${c.id}`)}
                        className={cn(
                          "transition-colors cursor-pointer group border-l-2 border-transparent",
                          idx % 2 === 1 && "bg-bg-hover/30",
                          "hover:bg-bg-hover hover:border-l-accent"
                        )}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ring-2 ring-transparent group-hover:ring-accent/30 transition-all",
                                avatarColor
                              )}
                            >
                              {initials(c.full_name)}
                            </div>
                            <span className="text-sm font-medium truncate">
                              {c.full_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="space-y-0.5">
                            {c.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                <Phone className="w-3 h-3" strokeWidth={2} />
                                {c.phone}
                              </div>
                            )}
                            {c.email && (
                              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                <Mail className="w-3 h-3" strokeWidth={2} />
                                <span className="truncate max-w-[180px]">{c.email}</span>
                              </div>
                            )}
                            {!c.phone && !c.email && (
                              <span className="text-xs text-text-subtle">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                            <Car className="w-3.5 h-3.5" strokeWidth={2} />
                            {c.vehicles_count}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className="inline-flex items-center gap-1 text-status-warning"
                              title="Aperte"
                            >
                              <FolderKanban className="w-3.5 h-3.5" />
                              {c.cases_open_count}
                            </span>
                            {c.cases_closed_count > 0 && (
                              <span className="text-text-subtle" title="Chiuse">
                                · {c.cases_closed_count} chiuse
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm tabular-nums">
                          {formatCurrency(c.revenue_total)}
                        </td>
                        <td className="px-5 py-3 text-xs text-text-muted">
                          {formatDate(c.last_activity_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <CustomerFormModal
          onClose={() => setShowNew(false)}
          onSaved={(c) => {
            setShowNew(false);
            router.push(`/customers/${c.id}`);
          }}
        />
      )}
    </div>
  );
}
