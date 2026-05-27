"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
} from "@/lib/constants";
import type { Lead, LeadStatus } from "@/types/database.types";
import { LeadCard } from "./LeadCard";
import { LeadModal } from "./LeadModal";
import { LeadToCustomerModal } from "./LeadToCustomerModal";
import { Plus, Search, SlidersHorizontal, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  initialLeads: Lead[];
}

const STATUS_SET = new Set<string>(LEAD_STATUS_ORDER);

const kanbanCollision: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  const columnHit = pointer.find((c) => STATUS_SET.has(String(c.id)));
  if (columnHit) return [columnHit];
  if (pointer.length > 0) return pointer;
  return rectIntersection(args);
};

export function KanbanBoard({ initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalLead, setModalLead] = useState<Lead | "new" | null>(null);
  // Conversione lead→cliente in corso: tiene il lead e la colonna di partenza
  // per poter tornare indietro se l'utente annulla il modale veicolo.
  const [converting, setConverting] = useState<{ lead: Lead; from: LeadStatus } | null>(
    null
  );
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const supabase = useMemo(() => createClient(), []);

  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) {
      if (l.source) set.add(l.source);
    }
    return Array.from(set).sort();
  }, [leads]);

  const activeFiltersCount =
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (sourceFilter ? 1 : 0);

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setSourceFilter("");
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const row = payload.new as Lead;
          setLeads((prev) => (prev.some((l) => l.id === row.id) ? prev : [row, ...prev]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const row = payload.new as Lead;
          setLeads((prev) => prev.map((l) => (l.id === row.id ? row : l)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "leads" },
        (payload) => {
          const oldRow = payload.old as { id?: string };
          if (!oldRow.id) return;
          setLeads((prev) => prev.filter((l) => l.id !== oldRow.id));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (sourceFilter && l.source !== sourceFilter) return false;
      const created = new Date(l.created_at).getTime();
      if (from !== null && created < from) return false;
      if (to !== null && created > to) return false;
      if (!q) return true;
      return (
        l.full_name.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
      );
    });
  }, [leads, search, dateFrom, dateTo, sourceFilter]);

  const grouped = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = {
      nuovo: [],
      contattato: [],
      preventivo: [],
      cliente: [],
      perso: [],
    };
    for (const l of filtered) map[l.status].push(l);
    for (const k of Object.keys(map) as LeadStatus[]) {
      map[k].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [filtered]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  function resolveStatus(id: string): LeadStatus | null {
    if (STATUS_SET.has(id)) return id as LeadStatus;
    const lead = leads.find((l) => l.id === id);
    return lead?.status ?? null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const draggedId = String(active.id);
    const fromStatus = resolveStatus(draggedId);
    const toStatus = resolveStatus(String(over.id));
    if (!fromStatus || !toStatus) return;
    if (fromStatus === toStatus) return;

    // Spostamento ottimistico della card.
    setLeads((prev) =>
      prev.map((l) => (l.id === draggedId ? { ...l, status: toStatus } : l))
    );

    // Passaggio a "cliente": obbligatorio inserire i dati della vettura tramite
    // il modale. Non tocchiamo il DB finché non si conferma; su annullo si torna
    // indietro e non viene creato nulla.
    if (toStatus === "cliente" && fromStatus !== "cliente") {
      const lead = leads.find((l) => l.id === draggedId);
      if (lead) {
        setConverting({ lead: { ...lead, status: "cliente" }, from: fromStatus });
        return;
      }
    }

    const { error } = await supabase
      .from("leads")
      .update({ status: toStatus })
      .eq("id", draggedId);

    if (error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === draggedId ? { ...l, status: fromStatus } : l))
      );
      toast.error("Spostamento fallito", { description: error.message });
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">Lead</h1>
          <p className="text-xs text-text-subtle">
            Trascina i lead tra le colonne. Spostandone uno in &quot;Cliente&quot; si
            inseriscono i dati della vettura e viene creata la pratica.
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 -translate-y-1/2"
              strokeWidth={2}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="input-base pl-8 w-56"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "btn-secondary relative",
              showFilters && "border-accent text-accent"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtri
            {activeFiltersCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center text-[10px] font-semibold min-w-[18px] h-[18px] rounded-full bg-accent text-accent-contrast px-1">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setModalLead("new")}
            className="btn-primary"
            type="button"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuovo lead
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="px-8 py-3 border-b border-border bg-bg-card/50 flex items-end gap-3 flex-wrap animate-slide-up">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-subtle font-medium block mb-1">
              Arrivato dal
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-base w-40"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-subtle font-medium block mb-1">
              al
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-base w-40"
            />
          </div>
          {sourceOptions.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-subtle font-medium block mb-1">
                Origine
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="input-base w-40"
              >
                <option value="">Tutte</option>
                {sourceOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeFiltersCount > 0 && (
            <button type="button" onClick={resetFilters} className="btn-ghost text-xs">
              <XIcon className="w-3.5 h-3.5" />
              Azzera filtri
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex gap-2 p-4 h-full min-w-max">
            {LEAD_STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={grouped[status]}
                onCardClick={(lead) => setModalLead(lead)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="rotate-2">
                <LeadCard lead={activeLead} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {modalLead && (
        <LeadModal
          lead={modalLead === "new" ? null : modalLead}
          onClose={() => setModalLead(null)}
          onSaved={() => setModalLead(null)}
        />
      )}

      {converting && (
        <LeadToCustomerModal
          lead={converting.lead}
          onCancel={() => {
            // Torna alla colonna di partenza: niente cliente/pratica creati.
            setLeads((prev) =>
              prev.map((l) =>
                l.id === converting.lead.id ? { ...l, status: converting.from } : l
              )
            );
            setConverting(null);
          }}
          onConverted={() => setConverting(null)}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  status,
  leads,
  onCardClick,
}: {
  status: LeadStatus;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const colors = LEAD_STATUS_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-52 shrink-0 flex flex-col h-full rounded-lg border border-dashed transition-colors overflow-hidden",
        isOver ? "border-accent bg-accent/5" : "border-transparent"
      )}
    >
      <div className={cn("h-0.5 shrink-0 rounded-t", colors.dot)} aria-hidden="true" />
      <div className="px-2.5 py-2 flex items-center gap-2 shrink-0">
        <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
        <h3 className="text-xs font-semibold truncate uppercase tracking-wide">
          {LEAD_STATUS_LABELS[status]}
        </h3>
        <span className="text-[10px] text-text-muted ml-auto tabular-nums px-1.5 py-0.5 rounded bg-bg-hover">
          {leads.length}
        </span>
      </div>

      <SortableContext
        items={leads.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-1.5 p-1.5 overflow-y-auto">
          {leads.length === 0 && (
            <div className="text-center text-[10px] text-text-subtle py-6">—</div>
          )}
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
