"use client";

import { useMemo, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { appointmentFormSchema, type AppointmentFormValues } from "@/lib/schemas";
import { useConfirm } from "../ConfirmDialog";
import type { Appointment, AppointmentKind, Customer, Case } from "@/types/database.types";

const KIND_LABELS: Record<AppointmentKind, string> = {
  accettazione: "Accettazione",
  consegna: "Consegna",
  sopralluogo: "Sopralluogo",
  lavorazione: "Lavorazione",
  altro: "Altro",
};

interface Props {
  appointment: Appointment | null;
  defaultDate?: string;
  customers: Pick<Customer, "id" | "full_name">[];
  cases: Pick<Case, "id" | "customer_id">[];
  onClose: () => void;
  onSaved: (a: Appointment) => void;
  onDeleted: (id: string) => void;
}

function toInputDateTime(iso: string | null | undefined, fallback?: string): string {
  if (!iso) return fallback ?? "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentModal({
  appointment,
  defaultDate,
  customers,
  cases,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();

  const [title, setTitle] = useState(appointment?.title ?? "");
  const [kind, setKind] = useState<AppointmentKind>(appointment?.kind ?? "accettazione");
  const [startsAt, setStartsAt] = useState<string>(
    toInputDateTime(appointment?.starts_at, defaultDate ? `${defaultDate}T09:00` : "")
  );
  const [endsAt, setEndsAt] = useState<string>(toInputDateTime(appointment?.ends_at));
  const [customerId, setCustomerId] = useState<string>(appointment?.customer_id ?? "");
  const [caseId, setCaseId] = useState<string>(appointment?.case_id ?? "");
  const [notes, setNotes] = useState<string>(appointment?.notes ?? "");
  const [errors, setErrors] = useState<Partial<Record<keyof AppointmentFormValues, string>>>({});
  const [saving, setSaving] = useState(false);

  const filteredCases = useMemo(() => {
    if (!customerId) return [];
    return cases.filter((c) => c.customer_id === customerId);
  }, [cases, customerId]);

  async function handleSave() {
    setErrors({});
    const payload: AppointmentFormValues = {
      title,
      kind,
      starts_at: startsAt ? new Date(startsAt).toISOString() : "",
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      customer_id: customerId || null,
      case_id: caseId || null,
      vehicle_id: null,
      notes: notes || null,
    };
    const result = appointmentFormSchema.safeParse(payload);
    if (!result.success) {
      const flat: Partial<Record<keyof AppointmentFormValues, string>> = {};
      for (const issue of result.error.issues) {
        flat[issue.path[0] as keyof AppointmentFormValues] = issue.message;
      }
      setErrors(flat);
      toast.error("Controlla i campi");
      return;
    }
    setSaving(true);
    try {
      if (appointment) {
        const { data, error } = await supabase
          .from("appointments")
          .update(result.data)
          .eq("id", appointment.id)
          .select()
          .single();
        if (error || !data) throw new Error(error?.message ?? "Update failed");
        toast.success("Appuntamento aggiornato");
        onSaved(data);
      } else {
        const { data, error } = await supabase
          .from("appointments")
          .insert(result.data)
          .select()
          .single();
        if (error || !data) throw new Error(error?.message ?? "Insert failed");
        toast.success("Appuntamento creato");
        onSaved(data);
      }
    } catch (e) {
      toast.error("Salvataggio fallito", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!appointment) return;
    const ok = await confirm({
      title: "Eliminare l'appuntamento?",
      description: appointment.title,
      confirmLabel: "Elimina",
      variant: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);
    if (error) {
      toast.error("Eliminazione fallita", { description: error.message });
      return;
    }
    toast.success("Appuntamento eliminato");
    onDeleted(appointment.id);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {appointment ? "Modifica appuntamento" : "Nuovo appuntamento"}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Titolo *" error={errors.title}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-base"
              placeholder="Sopralluogo per preventivo"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as AppointmentKind)}
                className="input-base"
              >
                {(Object.keys(KIND_LABELS) as AppointmentKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Inizio *" error={errors.starts_at}>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="input-base"
              />
            </Field>
          </div>

          <Field label="Fine (opzionale)" error={errors.ends_at}>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Cliente">
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setCaseId("");
              }}
              className="input-base"
            >
              <option value="">— Nessuno —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </Field>

          {customerId && filteredCases.length > 0 && (
            <Field label="Pratica collegata">
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="input-base"
              >
                <option value="">— Nessuna —</option>
                {filteredCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    Pratica {c.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Note">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-base resize-y min-h-[80px]"
              rows={3}
              placeholder="Dettagli o promemoria"
            />
          </Field>
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          {appointment ? (
            <button
              onClick={handleDelete}
              className="btn-ghost text-red-400 hover:text-red-300"
              type="button"
            >
              <Trash2 className="w-4 h-4" /> Elimina
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary" type="button">
              Annulla
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary" type="button">
              {saving ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
