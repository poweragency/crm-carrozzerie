"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from "@/lib/constants";
import { leadFormSchema, type LeadFormValues } from "@/lib/schemas";
import type { Lead, Note } from "@/types/database.types";
import { formatDateTime } from "@/lib/utils";
import { useConfirm } from "./ConfirmDialog";

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onSaved: () => void;
}

export function LeadModal({ lead, onClose, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();
  const [form, setForm] = useState<LeadFormValues>({
    full_name: lead?.full_name ?? "",
    phone: lead?.phone ?? null,
    email: lead?.email ?? null,
    message: lead?.message ?? null,
    status: lead?.status ?? "nuovo",
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFormValues, string>>>({});
  const [dirty, setDirty] = useState(false);

  async function attemptClose() {
    if (dirty) {
      const ok = await confirm({
        title: "Chiudere senza salvare?",
        description: "Le modifiche fatte verranno perse.",
        confirmLabel: "Chiudi senza salvare",
        cancelLabel: "Resta",
        variant: "danger",
      });
      if (!ok) return;
    }
    onClose();
  }

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") attemptClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  useEffect(() => {
    if (!lead) return;
    let cancelled = false;
    supabase
      .from("notes")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setNotes(data);
      });
    return () => {
      cancelled = true;
    };
  }, [lead, supabase]);

  function setField<K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setDirty(true);
  }

  async function handleSave() {
    const result = leadFormSchema.safeParse(form);
    if (!result.success) {
      const flat: Partial<Record<keyof LeadFormValues, string>> = {};
      for (const issue of result.error.issues) {
        flat[issue.path[0] as keyof LeadFormValues] = issue.message;
      }
      setErrors(flat);
      toast.error("Controlla i campi");
      return;
    }
    setSaving(true);
    const payload = result.data;
    try {
      if (lead) {
        const { error } = await supabase.from("leads").update(payload).eq("id", lead.id);
        if (error) throw new Error(error.message);
        toast.success("Lead aggiornato");
      } else {
        const { error } = await supabase
          .from("leads")
          .insert({ ...payload, source: "manual" });
        if (error) throw new Error(error.message);
        toast.success("Lead creato");
      }
      setDirty(false);
      onSaved();
    } catch (e) {
      toast.error("Salvataggio fallito", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;

    // Conta tutto quello che verrà eliminato in cascata.
    // Customer e pratiche chiuse NON vengono toccati (restano in /customers).
    const { data: customersData } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("lead_id", lead.id);
    const customerIds = customersData?.map((c) => c.id) ?? [];
    const customerNames = customersData?.map((c) => c.full_name) ?? [];

    // Pratiche aperte del customer linked
    const { data: openCasesData } = customerIds.length
      ? await supabase
          .from("cases")
          .select("id")
          .in("customer_id", customerIds)
          .in("status", ["preventivo", "attesa_pezzi", "lavorazione"])
      : { data: [] as Array<{ id: string }> };
    const openCaseIds = openCasesData?.map((c) => c.id) ?? [];

    // Preventivi, fatture, documenti delle pratiche aperte (cascade DB li eliminerà)
    let preventiviCount = 0;
    let fattureCount = 0;
    let documentsCount = 0;
    if (openCaseIds.length > 0) {
      const [{ count: prev }, { count: fatt }, { count: docs }] = await Promise.all([
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .in("case_id", openCaseIds)
          .eq("kind", "preventivo"),
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .in("case_id", openCaseIds)
          .eq("kind", "fattura"),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .in("case_id", openCaseIds),
      ]);
      preventiviCount = prev ?? 0;
      fattureCount = fatt ?? 0;
      documentsCount = docs ?? 0;
    }

    // Note del lead (cascade DB le eliminerà)
    const { count: leadNotesCount } = await supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", lead.id);

    const bullets: string[] = [];
    if (openCaseIds.length > 0) {
      bullets.push(
        `${openCaseIds.length} ${openCaseIds.length === 1 ? "pratica aperta" : "pratiche aperte"}`
      );
    }
    if (preventiviCount > 0) {
      bullets.push(
        `${preventiviCount} ${preventiviCount === 1 ? "preventivo" : "preventivi"}`
      );
    }
    if (fattureCount > 0) {
      bullets.push(`${fattureCount} ${fattureCount === 1 ? "fattura" : "fatture"}`);
    }
    if (documentsCount > 0) {
      bullets.push(
        `${documentsCount} ${documentsCount === 1 ? "documento (foto, PDF)" : "documenti (foto, PDF)"}`
      );
    }
    if ((leadNotesCount ?? 0) > 0) {
      bullets.push(
        `${leadNotesCount} ${leadNotesCount === 1 ? "nota del lead" : "note del lead"}`
      );
    }

    const sections: string[] = [];
    if (bullets.length > 0) {
      sections.push(`Verranno eliminati:\n• ${bullets.join("\n• ")}`);
    }
    if (customerNames.length > 0) {
      sections.push(
        `Il cliente "${customerNames.join('", "')}" resterà nella sezione Clienti, insieme alle vetture e alle eventuali pratiche già chiuse.`
      );
    }
    sections.push("Operazione non reversibile.");

    const ok = await confirm({
      title: `Eliminare il lead "${lead.full_name}"?`,
      description: sections.join("\n\n"),
      confirmLabel: "Elimina",
      variant: "danger",
    });
    if (!ok) return;

    const { error } = await supabase.rpc("delete_lead_cascade", {
      p_lead_id: lead.id,
    });
    if (error) {
      toast.error("Eliminazione fallita", { description: error.message });
      return;
    }
    setDirty(false);
    toast.success("Lead eliminato");
    onSaved();
  }

  async function handleAddNote() {
    if (!lead || !newNote.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("notes")
      .insert({ lead_id: lead.id, body: newNote.trim(), author_id: user?.id ?? null })
      .select()
      .single();
    if (error || !data) {
      toast.error("Errore nota", { description: error?.message });
      return;
    }
    setNotes([data, ...notes]);
    setNewNote("");
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={attemptClose}
    >
      <div
        className="card w-full max-w-lg max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {lead ? "Modifica lead" : "Nuovo lead"}
            {dirty && (
              <span
                className="ml-2 text-[11px] text-yellow-400"
                title="Modifiche non salvate"
              >
                ●
              </span>
            )}
          </h2>
          <button
            onClick={attemptClose}
            className="text-text-muted hover:text-text"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <FormField label="Nome *" error={errors.full_name}>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              className="input-base"
              placeholder="Mario Rossi"
              autoFocus
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Telefono" error={errors.phone}>
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value || null)}
                className="input-base"
                placeholder="333 1234567"
              />
            </FormField>
            <FormField label="Email" error={errors.email}>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value || null)}
                className="input-base"
                placeholder="mario@email.it"
              />
            </FormField>
          </div>

          <FormField label="Messaggio / Note" error={errors.message}>
            <textarea
              value={form.message ?? ""}
              onChange={(e) => setField("message", e.target.value || null)}
              rows={3}
              className="input-base resize-none"
              placeholder="Dettagli sul lead..."
            />
          </FormField>

          <FormField label="Stato" error={errors.status}>
            <select
              value={form.status}
              onChange={(e) =>
                setField("status", e.target.value as LeadFormValues["status"])
              }
              className="input-base"
            >
              {LEAD_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {form.status === "cliente" && lead?.status !== "cliente" && (
              <p className="text-xs text-accent mt-1.5">
                Salvando, verrà creato automaticamente un cliente e una pratica.
              </p>
            )}
          </FormField>

          {lead && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-2">Note</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                  placeholder="Aggiungi una nota..."
                  className="input-base"
                />
                <button
                  onClick={handleAddNote}
                  className="btn-secondary shrink-0"
                  type="button"
                >
                  Aggiungi
                </button>
              </div>
              <div className="mt-3 space-y-2 max-h-40 overflow-auto">
                {notes.map((n) => (
                  <div key={n.id} className="bg-bg-hover rounded-md p-2.5">
                    <div className="text-xs text-text">{n.body}</div>
                    <div className="text-[10px] text-text-subtle mt-1">
                      {formatDateTime(n.created_at)}
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="text-xs text-text-subtle text-center py-2">
                    Nessuna nota
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          {lead ? (
            <button
              onClick={handleDelete}
              className="btn-ghost text-red-400 hover:text-red-300"
              type="button"
            >
              <Trash2 className="w-4 h-4" />
              Elimina
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={attemptClose} className="btn-secondary" type="button">
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
              type="button"
            >
              {saving ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
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
