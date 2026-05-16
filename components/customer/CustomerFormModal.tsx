"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { customerFormSchema, type CustomerFormValues } from "@/lib/schemas";
import { Field } from "@/components/case/Field";
import type { Customer } from "@/types/database.types";

interface Props {
  initial?: Customer | null;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}

export function CustomerFormModal({ initial, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [values, setValues] = useState<CustomerFormValues>({
    full_name: initial?.full_name ?? "",
    phone: initial?.phone ?? null,
    email: initial?.email ?? null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormValues, string>>>(
    {}
  );
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSave() {
    const result = customerFormSchema.safeParse(values);
    if (!result.success) {
      const flat: Partial<Record<keyof CustomerFormValues, string>> = {};
      for (const issue of result.error.issues) {
        flat[issue.path[0] as keyof CustomerFormValues] = issue.message;
      }
      setErrors(flat);
      toast.error("Controlla i campi");
      return;
    }
    setSaving(true);
    if (initial) {
      const { data, error } = await supabase
        .from("customers")
        .update(result.data)
        .eq("id", initial.id)
        .select()
        .single();
      setSaving(false);
      if (error || !data) {
        toast.error("Salvataggio fallito", { description: error?.message });
        return;
      }
      toast.success("Cliente aggiornato");
      onSaved(data);
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert(result.data)
        .select()
        .single();
      setSaving(false);
      if (error || !data) {
        toast.error("Salvataggio fallito", { description: error?.message });
        return;
      }
      toast.success("Cliente creato");
      onSaved(data);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md max-h-[90vh] overflow-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {initial ? "Modifica cliente" : "Nuovo cliente"}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text"
            type="button"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Field label="Nome completo *" htmlFor="cf-name" error={errors.full_name}>
            <input
              id="cf-name"
              value={values.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              className="input-base"
              placeholder="Mario Rossi"
              autoFocus
            />
          </Field>
          <Field label="Telefono" htmlFor="cf-phone" error={errors.phone}>
            <input
              id="cf-phone"
              type="tel"
              value={values.phone ?? ""}
              onChange={(e) => setField("phone", e.target.value || null)}
              className="input-base"
              placeholder="+39 333 1234567"
            />
          </Field>
          <Field label="Email" htmlFor="cf-email" error={errors.email}>
            <input
              id="cf-email"
              type="email"
              value={values.email ?? ""}
              onChange={(e) => setField("email", e.target.value || null)}
              className="input-base"
              placeholder="mario@example.com"
            />
          </Field>
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary" type="button">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            type="button"
          >
            {saving ? "Salvataggio..." : initial ? "Salva" : "Crea cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
