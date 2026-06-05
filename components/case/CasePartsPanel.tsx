"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Wrench, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CasePart, UserRole } from "@/types/database.types";
import { isEmployeeRole } from "@/lib/roles";

interface Props {
  caseId: string;
  initialParts: CasePart[];
  role: UserRole;
}

export function CasePartsPanel({ caseId, initialParts, role }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [parts, setParts] = useState<CasePart[]>(initialParts);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [adding, setAdding] = useState(false);

  const isOwner = role === "owner";
  const isEmployee = isEmployeeRole(role);
  const totalChecked = parts.filter((p) => p.checked_at).length;
  const totalParts = parts.length;
  const allChecked = totalParts > 0 && totalChecked === totalParts;

  async function handleAdd() {
    const trimmed = name.trim();
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!trimmed) {
      toast.error("Inserisci il nome del ricambio");
      return;
    }
    setAdding(true);
    const { data, error } = await supabase
      .from("case_parts")
      .insert({ case_id: caseId, name: trimmed, quantity: qty })
      .select()
      .single();
    setAdding(false);
    if (error || !data) {
      toast.error("Aggiunta fallita", { description: error?.message });
      return;
    }
    setParts((p) => [...p, data]);
    setName("");
    setQuantity("1");
  }

  async function toggleChecked(part: CasePart) {
    const nowChecked = !part.checked_at;
    // Aggiornamento ottimistico
    setParts((prev) =>
      prev.map((p) =>
        p.id === part.id
          ? {
              ...p,
              checked_at: nowChecked ? new Date().toISOString() : null,
              checked_by: nowChecked ? part.checked_by : null,
            }
          : p
      )
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const patch = nowChecked
      ? { checked_at: new Date().toISOString(), checked_by: user?.id ?? null }
      : { checked_at: null, checked_by: null };
    const { error } = await supabase.from("case_parts").update(patch).eq("id", part.id);
    if (error) {
      // rollback
      setParts((prev) =>
        prev.map((p) =>
          p.id === part.id
            ? { ...p, checked_at: part.checked_at, checked_by: part.checked_by }
            : p
        )
      );
      toast.error("Aggiornamento fallito", { description: error.message });
    }
  }

  async function handleDelete(part: CasePart) {
    if (!isOwner) return;
    const prev = parts;
    setParts((p) => p.filter((x) => x.id !== part.id));
    const { error } = await supabase.from("case_parts").delete().eq("id", part.id);
    if (error) {
      setParts(prev);
      toast.error("Eliminazione fallita", { description: error.message });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
        <Wrench className="w-3.5 h-3.5" />
        Ricambi
        {totalParts > 0 && (
          <span
            className={cn(
              "ml-1 text-[11px] tabular-nums rounded-full px-2 py-0.5",
              allChecked
                ? "bg-status-success/15 text-status-success"
                : "bg-bg-hover text-text-subtle"
            )}
          >
            {totalChecked}/{totalParts} spuntati
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Nome ricambio (es. Paraurti anteriore)"
          className="input-base flex-1"
        />
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="input-base w-full sm:w-20"
          aria-label="Quantità"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !name.trim()}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Aggiungi
        </button>
      </div>

      {parts.length === 0 ? (
        <div className="text-xs text-text-subtle italic py-2">
          Nessun ricambio. Aggiungi quelli necessari per questa pratica.
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-md bg-bg-elevated">
          {parts.map((p) => {
            const checked = !!p.checked_at;
            return (
              <li
                key={p.id}
                className="px-3 py-2.5 flex items-center gap-3 hover:bg-bg-hover transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleChecked(p)}
                  className={cn(
                    "shrink-0",
                    checked ? "text-status-success" : "text-text-subtle hover:text-text"
                  )}
                  aria-label={checked ? "Togli spunta" : "Spunta come pronto"}
                >
                  {checked ? (
                    <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <span
                  className={cn(
                    "text-sm flex-1 truncate",
                    checked && "line-through text-text-muted"
                  )}
                >
                  {p.name}
                </span>
                <span className="text-xs text-text-muted tabular-nums shrink-0">
                  ×{p.quantity}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="p-1 text-text-subtle hover:text-status-danger shrink-0"
                    aria-label="Elimina ricambio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isEmployee && role === "finitore" && totalParts > 0 && !allChecked && (
        <div className="text-[11px] text-yellow-400">
          Devi spuntare tutti i ricambi prima di passare la pratica al titolare.
        </div>
      )}
    </div>
  );
}
