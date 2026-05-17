"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
}

export function CustomerPanel({ customers, selectedCustomerId, onSelect }: Props) {
  const selected = customers.find((c) => c.id === selectedCustomerId) ?? null;

  return (
    <Section title="Cliente" description="Seleziona un cliente esistente dalla rubrica.">
      <Field label="Cliente">
        <select
          value={selectedCustomerId ?? ""}
          onChange={(e) => onSelect(e.target.value || null)}
          className="input-base"
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
      </Field>

      {selected && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-text-subtle mb-1">
              Telefono
            </div>
            <div className="text-sm">{selected.phone || "—"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-text-subtle mb-1">
              Email
            </div>
            <div className="text-sm truncate">{selected.email || "—"}</div>
          </div>
        </div>
      )}

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
