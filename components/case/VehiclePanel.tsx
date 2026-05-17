"use client";

import { Plus } from "lucide-react";
import { Field, Section } from "./Field";
import type { Vehicle } from "@/types/database.types";

interface Props {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelect: (id: string | null) => void;
  customerSelected: boolean;
  onCreateNew: () => void;
}

function label(v: Vehicle): string {
  return [v.make, v.model, v.plate].filter(Boolean).join(" · ") || "Veicolo senza dati";
}

export function VehiclePanel({
  vehicles,
  selectedVehicleId,
  onSelect,
  customerSelected,
  onCreateNew,
}: Props) {
  const selected = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  return (
    <Section
      title="Veicolo"
      description={
        customerSelected
          ? vehicles.length > 0
            ? "Seleziona uno dei veicoli del cliente."
            : "Questo cliente non ha ancora veicoli registrati."
          : "Seleziona prima un cliente."
      }
    >
      <Field label="Veicolo collegato">
        <div className="flex gap-2">
          <select
            value={selectedVehicleId ?? ""}
            onChange={(e) => onSelect(e.target.value || null)}
            className="input-base flex-1"
            disabled={!customerSelected || vehicles.length === 0}
          >
            <option value="">
              {vehicles.length === 0 ? "— Nessun veicolo —" : "— Nessuno —"}
            </option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {label(v)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onCreateNew}
            disabled={!customerSelected}
            className="btn-secondary py-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              customerSelected
                ? "Aggiungi un veicolo a questo cliente"
                : "Seleziona prima un cliente"
            }
          >
            <Plus className="w-3.5 h-3.5" />
            Nuovo
          </button>
        </div>
      </Field>

      {selected && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-subtle mb-1">
                Marca
              </div>
              <div className="text-sm">{selected.make || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-subtle mb-1">
                Modello
              </div>
              <div className="text-sm">{selected.model || "—"}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-subtle mb-1">
                Targa
              </div>
              <div className="text-sm font-mono">{selected.plate || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-subtle mb-1">
                Anno
              </div>
              <div className="text-sm tabular-nums">
                {selected.year != null ? selected.year : "—"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-subtle mb-1">
                Colore
              </div>
              <div className="text-sm">{selected.color || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-subtle mb-1">
                Telaio (VIN)
              </div>
              <div className="text-sm font-mono truncate">{selected.vin || "—"}</div>
            </div>
          </div>
        </>
      )}
    </Section>
  );
}
