"use client";

import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { Field, Section } from "./Field";

export interface CustomerOption {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

interface Props {
  customers: CustomerOption[];
  selectedCustomerId: string | null;
  onSelect: (id: string | null) => void;
  onCreateNew: () => void;
}

export function CustomerPanel({
  customers,
  selectedCustomerId,
  onSelect,
  onCreateNew,
}: Props) {
  const selected = customers.find((c) => c.id === selectedCustomerId) ?? null;

  return (
    <Section title="Cliente" description="Seleziona un cliente esistente dalla rubrica.">
      <Field label="Cliente">
        <div className="flex gap-2">
          <select
            value={selectedCustomerId ?? ""}
            onChange={(e) => onSelect(e.target.value || null)}
            className="input-base flex-1"
          >
            <option value="" disabled>
              — Seleziona cliente —
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onCreateNew}
            className="btn-secondary py-1.5 shrink-0"
            title="Crea un nuovo cliente"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuovo
          </button>
        </div>
      </Field>

      {selected && (
        <Link
          href={`/customers/${selected.id}`}
          className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
        >
          Apri scheda cliente <ExternalLink className="w-3 h-3" />
        </Link>
      )}
    </Section>
  );
}
