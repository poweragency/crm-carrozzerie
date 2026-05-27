"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Car } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { vehicleFormSchema, type VehicleFormInputValues } from "@/lib/schemas";
import { Field } from "@/components/case/Field";
import { useConfirm } from "@/components/ConfirmDialog";
import { useUnsavedChangesWarning } from "@/lib/hooks/useUnsavedChangesWarning";
import type { Lead } from "@/types/database.types";

interface Props {
  lead: Lead;
  // L'utente annulla / esce: il lead torna nella colonna precedente, niente creato.
  onCancel: () => void;
  // Conversione completata: cliente + pratica + veicolo creati.
  onConverted: () => void;
}

const empty: VehicleFormInputValues = {
  make: null,
  model: null,
  plate: null,
  year: null,
  color: null,
  vin: null,
  notes: null,
};

export function LeadToCustomerModal({ lead, onCancel, onConverted }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();

  const [values, setValues] = useState<VehicleFormInputValues>(empty);
  const [errors, setErrors] = useState<
    Partial<Record<keyof VehicleFormInputValues, string>>
  >({});
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(
    () => Object.values(values).some((v) => v != null && v !== ""),
    [values]
  );
  useUnsavedChangesWarning(dirty && !saving);

  function setField<K extends keyof VehicleFormInputValues>(
    key: K,
    value: VehicleFormInputValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function attemptClose() {
    if (saving) return;
    if (dirty) {
      const ok = await confirm({
        title: "Uscire senza creare il cliente?",
        description:
          "Il lead tornerà nella colonna precedente. Non verranno creati né cliente né pratica.",
        confirmLabel: "Esci",
        cancelLabel: "Resta",
        variant: "danger",
      });
      if (!ok) return;
    }
    onCancel();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") attemptClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving]);

  async function handleSave() {
    const result = vehicleFormSchema.safeParse(values);
    if (!result.success) {
      const flat: Partial<Record<keyof VehicleFormInputValues, string>> = {};
      for (const issue of result.error.issues) {
        flat[issue.path[0] as keyof VehicleFormInputValues] = issue.message;
      }
      setErrors(flat);
      toast.error("Controlla i campi");
      return;
    }
    // La targa è obbligatoria: non si crea un cliente senza identificare la vettura.
    if (!result.data.plate) {
      setErrors((e) => ({ ...e, plate: "Targa obbligatoria" }));
      toast.error("Inserisci almeno la targa della vettura");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("convert_lead_to_vehicle_customer", {
      p_lead_id: lead.id,
      p_make: result.data.make,
      p_model: result.data.model,
      p_plate: result.data.plate,
      p_year: result.data.year,
      p_color: result.data.color,
      p_vin: result.data.vin,
      p_notes: result.data.notes,
    });
    if (error) {
      setSaving(false);
      toast.error("Creazione non riuscita", { description: error.message });
      return;
    }
    toast.success("Cliente e pratica creati", {
      description: "Veicolo collegato alla pratica.",
    });
    onConverted();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={attemptClose}
    >
      <div
        className="card w-full max-w-md max-h-[90vh] overflow-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Car className="w-4 h-4 text-accent shrink-0" />
            <h2 className="text-base font-semibold truncate">
              Dati vettura — {lead.full_name}
            </h2>
          </div>
          <button
            onClick={attemptClose}
            className="text-text-muted hover:text-text shrink-0"
            type="button"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <p className="text-xs text-text-muted">
            Per trasformare il lead in cliente inserisci i dati della vettura. La targa è
            obbligatoria. Cliente e pratica verranno creati solo al salvataggio.
          </p>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Targa *" htmlFor="lc-plate" error={errors.plate}>
              <input
                id="lc-plate"
                value={values.plate ?? ""}
                onChange={(e) => setField("plate", e.target.value.toUpperCase() || null)}
                className="input-base font-mono"
                placeholder="AB123CD"
                autoFocus
              />
            </Field>
            <Field label="Anno" htmlFor="lc-year" error={errors.year}>
              <input
                id="lc-year"
                type="text"
                inputMode="numeric"
                value={values.year ?? ""}
                onChange={(e) =>
                  setField(
                    "year",
                    e.target.value.replace(/[^\d]/g, "").slice(0, 4) || null
                  )
                }
                className="input-base"
                placeholder="2020"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca" htmlFor="lc-make" error={errors.make}>
              <input
                id="lc-make"
                value={values.make ?? ""}
                onChange={(e) => setField("make", e.target.value || null)}
                className="input-base"
                placeholder="Fiat"
              />
            </Field>
            <Field label="Modello" htmlFor="lc-model" error={errors.model}>
              <input
                id="lc-model"
                value={values.model ?? ""}
                onChange={(e) => setField("model", e.target.value || null)}
                className="input-base"
                placeholder="Panda"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Colore" htmlFor="lc-color" error={errors.color}>
              <input
                id="lc-color"
                value={values.color ?? ""}
                onChange={(e) => setField("color", e.target.value || null)}
                className="input-base"
                placeholder="Bianco"
              />
            </Field>
            <Field label="Telaio (VIN)" htmlFor="lc-vin" error={errors.vin}>
              <input
                id="lc-vin"
                value={values.vin ?? ""}
                onChange={(e) => setField("vin", e.target.value.toUpperCase() || null)}
                className="input-base font-mono"
                placeholder="WAUZZZ..."
              />
            </Field>
          </div>
          <Field label="Note" htmlFor="lc-notes" error={errors.notes}>
            <textarea
              id="lc-notes"
              value={values.notes ?? ""}
              onChange={(e) => setField("notes", e.target.value || null)}
              className="input-base resize-y min-h-[60px]"
              rows={2}
              placeholder="Opzionale"
            />
          </Field>
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={attemptClose} className="btn-secondary" type="button">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            type="button"
          >
            {saving ? "Creazione..." : "Crea cliente e pratica"}
          </button>
        </div>
      </div>
    </div>
  );
}
