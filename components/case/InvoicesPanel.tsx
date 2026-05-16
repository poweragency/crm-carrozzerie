"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, ChevronRight, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types/database.types";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
  pagato: "Pagato",
  scaduto: "Scaduto",
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  bozza: "text-text-muted bg-bg-hover",
  inviato: "text-blue-400 bg-blue-500/10",
  accettato: "text-emerald-400 bg-emerald-500/10",
  rifiutato: "text-red-400 bg-red-500/10",
  pagato: "text-accent bg-accent/10",
  scaduto: "text-yellow-400 bg-yellow-500/10",
};

interface Props {
  caseId: string;
  invoices: Invoice[];
}

export function InvoicesPanel({ caseId, invoices }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function createNew() {
    setCreating(true);
    try {
      // Si crea come bozza di preventivo. Nell'editor l'utente può
      // cambiare in fattura tramite il selettore Tipo.
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ case_id: caseId, kind: "preventivo" }),
      });
      if (!res.ok) {
        const text = await res.text();
        toast.error("Creazione fallita", { description: text });
        return;
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/invoices/${id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
          <FileText className="w-3.5 h-3.5" />
          Preventivi e fatture
          <span className="text-text-subtle">({invoices.length})</span>
        </div>
        <button
          type="button"
          onClick={createNew}
          disabled={creating}
          className="btn-primary py-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          {creating ? "Creazione..." : "Preventivo / Fattura"}
        </button>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessun preventivo o fattura"
          description="Creane uno per generare il PDF da inviare al cliente."
        />
      ) : (
        <div className="space-y-1.5">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="flex items-center gap-3 p-2.5 rounded-md bg-bg-hover/50 border border-border hover:bg-bg-hover transition-colors"
            >
              <FileText className="w-4 h-4 text-text-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">
                  {inv.kind === "preventivo" ? "Preventivo" : "Fattura"} {inv.number}
                </div>
                <div className="text-[10px] text-text-subtle">
                  Emesso {formatDate(inv.issued_at)}
                </div>
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded inline-flex items-center gap-1",
                  STATUS_COLORS[inv.status]
                )}
                title="Stato interno, non visibile al cliente"
              >
                <EyeOff className="w-2.5 h-2.5" />
                {STATUS_LABELS[inv.status]}
              </span>
              <span className="text-xs tabular-nums shrink-0 min-w-[80px] text-right">
                {formatCurrency(inv.total)}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-text-subtle shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
