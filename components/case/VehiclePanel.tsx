"use client";

import { Field, Section } from "./Field";
import type { Vehicle } from "@/types/database.types";

interface Props {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelect: (id: string | null) => void;
  customerSelected: boolean;
}

function label(v: Vehicle): string {
  return [v.make, v.model, v.plate].filter(Boolean).join(" · ") || "Veicolo senza dati";
}

export function VehiclePanel({
  vehicles,
  selectedVehicleId,
  onSelect,
  customerSelected,
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
        <select
          value={selectedVehicleId ?? ""}
          onChange={(e) => onSelect(e.target.value || null)}
          className="input-base"
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
