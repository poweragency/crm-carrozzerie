"use client";

import { Field, Section } from "./Field";
import type { CaseFormInputValues } from "@/lib/schemas";

interface Props {
  values: CaseFormInputValues;
  errors?: Partial<Record<keyof CaseFormInputValues, string>>;
  onChange: (patch: Partial<CaseFormInputValues>) => void;
}

export function CasePanel({ values, errors, onChange }: Props) {
  return (
    <Section title="Pratica">
      <Field label="Prezzo (€)" htmlFor="case-price" error={errors?.price}>
        <input
          id="case-price"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={values.price}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
            const parts = v.split(".");
            const clean = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : v;
            onChange({ price: clean });
          }}
          className="input-base"
          placeholder="0.00"
        />
      </Field>
      <Field
        label="Descrizione lavori"
        htmlFor="case-description"
        error={errors?.description}
      >
        <textarea
          id="case-description"
          value={values.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value || null })}
          className="input-base resize-y min-h-[80px]"
          rows={3}
          placeholder="Riparazione paraurti, verniciatura..."
        />
      </Field>
    </Section>
  );
}
