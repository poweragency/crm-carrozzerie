"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Save,
  Download,
  FileText,
  Info,
  EyeOff,
} from "lucide-react";
import { Breadcrumb } from "../ui/Breadcrumb";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import { invoiceFormSchema, type InvoiceFormValues } from "@/lib/schemas";
import { InvoicePDF } from "./InvoicePDF";
import { useConfirm } from "../ConfirmDialog";
import type {
  Invoice,
  InvoiceItem,
  InvoiceKind,
  InvoiceStatus,
  Customer,
  Profile,
  Vehicle,
} from "@/types/database.types";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false }
);

const KIND_LABELS: Record<InvoiceKind, string> = {
  preventivo: "Preventivo",
  fattura: "Fattura",
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
  pagato: "Pagato",
  scaduto: "Scaduto",
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  bozza: "text-text-muted bg-bg-hover",
  inviato: "text-blue-400 bg-blue-500/10",
  accettato: "text-emerald-400 bg-emerald-500/10",
  rifiutato: "text-red-400 bg-red-500/10",
  pagato: "text-accent bg-accent/10",
  scaduto: "text-yellow-400 bg-yellow-500/10",
};

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Pick<Customer, "id" | "full_name" | "phone" | "email">;
  vehicle: Pick<Vehicle, "make" | "model" | "plate"> | null;
  profile: Profile;
  userEmail: string;
}

interface ItemDraft {
  id: string | null;
  description: string;
  quantity: string;
  unit_price: string;
}

function toDraft(item: InvoiceItem): ItemDraft {
  return {
    id: item.id,
    description: item.description,
    quantity: String(item.quantity),
    unit_price: String(item.unit_price),
  };
}

export function InvoiceEditor({
  invoice,
  items: initialItems,
  customer,
  vehicle,
  profile,
  userEmail,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();

  const [kind, setKind] = useState<InvoiceKind>(invoice.kind);
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const [issuedAt, setIssuedAt] = useState<string>(invoice.issued_at);
  const [dueAt, setDueAt] = useState<string>(invoice.due_at ?? "");
  const [vatRate, setVatRate] = useState<string>(String(invoice.vat_rate));
  const [notes, setNotes] = useState<string>(invoice.notes ?? "");
  const [items, setItems] = useState<ItemDraft[]>(
    initialItems.length > 0
      ? initialItems.map(toDraft)
      : [{ id: null, description: "", quantity: "1", unit_price: "0" }]
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);


  const computed = useMemo(() => {
    const numericRate = Number(vatRate) || 0;
    const lines = items.map((it) => {
      const q = Number(it.quantity) || 0;
      const p = Number(it.unit_price) || 0;
      return { ...it, line_total: Math.round(q * p * 100) / 100 };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);
    const vat = Math.round((subtotal * numericRate) / 100 * 100) / 100;
    return {
      lines,
      subtotal,
      vatRate: numericRate,
      vatAmount: vat,
      total: Math.round((subtotal + vat) * 100) / 100,
    };
  }, [items, vatRate]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: null, description: "", quantity: "1", unit_price: "0" },
    ]);
    setDirty(true);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function patchItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    setDirty(true);
  }

  async function handleSave() {
    setErrors({});
    const formValues: InvoiceFormValues = {
      kind,
      status,
      issued_at: issuedAt,
      due_at: dueAt || null,
      vat_rate: Number(vatRate),
      notes: notes || null,
      items: items.map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
      })),
    };
    const result = invoiceFormSchema.safeParse(formValues);
    if (!result.success) {
      const flat: Record<string, string> = {};
      for (const issue of result.error.issues) {
        flat[issue.path.join(".")] = issue.message;
      }
      setErrors(flat);
      toast.error("Controlla i campi");
      return;
    }

    setSaving(true);
    try {
      const { error: invErr } = await supabase
        .from("invoices")
        .update({
          kind: result.data.kind,
          status: result.data.status,
          issued_at: result.data.issued_at,
          due_at: result.data.due_at,
          vat_rate: result.data.vat_rate,
          notes: result.data.notes,
        })
        .eq("id", invoice.id);
      if (invErr) throw new Error(invErr.message);

      // RPC atomica: delete + insert in transazione singola lato DB.
      const { error: rpcErr } = await supabase.rpc("save_invoice_items", {
        p_invoice_id: invoice.id,
        p_items: result.data.items,
      });
      if (rpcErr) throw new Error(`Righe: ${rpcErr.message}`);

      setDirty(false);
      toast.success("Salvato");
      router.refresh();
    } catch (e) {
      toast.error("Salvataggio fallito", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const itemCount = items.length;
    const itemDetail =
      itemCount > 0
        ? `Contiene ${itemCount} ${itemCount === 1 ? "riga" : "righe"} per un totale di ${formatCurrency(computed.total)}.\n\n`
        : "";
    const ok = await confirm({
      title: `Eliminare ${KIND_LABELS[kind].toLowerCase()} N. ${invoice.number}?`,
      description: `${itemDetail}Azione irreversibile.`,
      confirmLabel: "Elimina",
      variant: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
    if (error) {
      toast.error("Eliminazione fallita", { description: error.message });
      return;
    }
    toast.success("Eliminato");
    router.push(`/cases/${invoice.case_id}`);
  }

  const pdfDoc = (
    <InvoicePDF
      kind={kind}
      number={invoice.number}
      issuedAt={issuedAt}
      dueAt={dueAt || null}
      workshop={{
        name: profile.workshop_name ?? "La mia carrozzeria",
        address: profile.address,
        city: profile.city,
        postalCode: profile.postal_code,
        province: profile.province,
        vatNumber: profile.vat_number,
        taxCode: profile.tax_code,
        phone: profile.phone,
        email: userEmail,
        iban: profile.iban,
        logoUrl: profile.logo_url ?? null,
      }}
      customer={{
        fullName: customer.full_name,
        phone: customer.phone,
        email: customer.email,
      }}
      vehicle={vehicle}
      items={computed.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity) || 0,
        unitPrice: Number(l.unit_price) || 0,
        lineTotal: l.line_total,
      }))}
      subtotal={computed.subtotal}
      vatRate={computed.vatRate}
      vatAmount={computed.vatAmount}
      total={computed.total}
      notes={notes || null}
    />
  );

  return (
    <div className="max-w-4xl mx-auto p-8 pb-40 sm:pb-32">
      <div className="sticky top-0 -mx-8 px-8 py-2 bg-bg/95 backdrop-blur z-20 border-b border-border/50 mb-4">
        <Breadcrumb
          items={[
            { label: "Pratiche", href: "/cases" },
            { label: customer.full_name || "Pratica", href: `/cases/${invoice.case_id}` },
            { label: `${KIND_LABELS[kind]} ${invoice.number}` },
          ]}
        />
      </div>

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {KIND_LABELS[kind]} N. {invoice.number}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-text-muted">
            <span>Cliente: {customer.full_name}</span>
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1",
                STATUS_COLORS[status]
              )}
              title="Lo stato è solo per la tua gestione interna. Non appare nel PDF inviato al cliente."
            >
              <EyeOff className="w-3 h-3" />
              {STATUS_LABELS[status]}
            </span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="btn-ghost text-red-400 hover:text-red-300"
          type="button"
        >
          <Trash2 className="w-4 h-4" /> Elimina
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-md px-3 py-2 mb-5 flex items-start gap-2 text-xs text-text-muted">
        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-blue-300">Vista interna.</strong> Lo{" "}
          <strong>stato</strong> (bozza, inviato, accettato…) e queste impostazioni
          servono solo a te per gestire i preventivi. Il cliente riceverà{" "}
          <strong>solo il PDF</strong> con descrizione lavori, importi e i dati della tua
          officina — niente stato o info amministrative.
        </div>
      </div>

      <div className="card p-6 mb-5 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Tipo">
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as InvoiceKind);
                setDirty(true);
              }}
              className="input-base"
            >
              <option value="preventivo">Preventivo</option>
              <option value="fattura">Fattura</option>
            </select>
          </Field>
          <Field
            label="Stato (solo tuo)"
            hint="Non appare nel PDF né nell'email — è un promemoria per te"
          >
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as InvoiceStatus);
                setDirty(true);
              }}
              className="input-base"
            >
              {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Emissione" error={errors.issued_at}>
            <input
              type="date"
              value={issuedAt}
              onChange={(e) => {
                setIssuedAt(e.target.value);
                setDirty(true);
              }}
              className="input-base"
            />
          </Field>
          <Field label="Scadenza" error={errors.due_at}>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => {
                setDueAt(e.target.value);
                setDirty(true);
              }}
              className="input-base"
            />
          </Field>
        </div>
      </div>

      <div className="card p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-subtle">
            Righe
          </h2>
          <button onClick={addItem} className="btn-secondary py-1.5" type="button">
            <Plus className="w-3.5 h-3.5" /> Aggiungi riga
          </button>
        </div>

        <div className="space-y-2">
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[10px] uppercase text-text-subtle font-semibold px-2">
            <div className="col-span-6">Descrizione</div>
            <div className="col-span-2 text-right">Qta</div>
            <div className="col-span-2 text-right">Prezzo €</div>
            <div className="col-span-2 text-right">Totale</div>
          </div>
          {items.map((it, idx) => {
            const q = Number(it.quantity) || 0;
            const p = Number(it.unit_price) || 0;
            const line = Math.round(q * p * 100) / 100;
            return (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-start bg-bg-hover/40 border border-border rounded-md p-2"
              >
                <div className="col-span-12 sm:col-span-6">
                  <input
                    value={it.description}
                    onChange={(e) => patchItem(idx, { description: e.target.value })}
                    placeholder="Es. Sostituzione paraurti anteriore"
                    className="input-base"
                  />
                  {errors[`items.${idx}.description`] && (
                    <p className="text-[10px] text-red-400 mt-1">
                      {errors[`items.${idx}.description`]}
                    </p>
                  )}
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={it.quantity}
                    onChange={(e) => patchItem(idx, { quantity: e.target.value })}
                    className="input-base text-right tabular-nums"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={it.unit_price}
                    onChange={(e) => patchItem(idx, { unit_price: e.target.value })}
                    className="input-base text-right tabular-nums"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 flex items-center justify-end text-sm tabular-nums">
                  {formatCurrency(line)}
                </div>
                <div className="col-span-1 flex justify-end items-center">
                  <button
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="text-text-subtle hover:text-red-400 disabled:opacity-30 p-1"
                    type="button"
                    title="Rimuovi riga"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {errors["items"] && (
            <p className="text-xs text-red-400">{errors["items"]}</p>
          )}
        </div>

        <div className="border-t border-border mt-4 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <Field label="IVA %" error={errors.vat_rate}>
            <input
              type="number"
              step="0.5"
              value={vatRate}
              onChange={(e) => {
                setVatRate(e.target.value);
                setDirty(true);
              }}
              className="input-base"
            />
          </Field>
          <div className="sm:col-span-2 flex flex-col items-end gap-1 text-sm tabular-nums">
            <div className="flex justify-between w-56">
              <span className="text-text-muted">Imponibile</span>
              <span>{formatCurrency(computed.subtotal)}</span>
            </div>
            <div className="flex justify-between w-56">
              <span className="text-text-muted">IVA {computed.vatRate}%</span>
              <span>{formatCurrency(computed.vatAmount)}</span>
            </div>
            <div className="flex justify-between w-56 border-t border-border pt-1 mt-1 font-semibold">
              <span>Totale</span>
              <span>{formatCurrency(computed.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-5">
        <Field label="Note (stampate sul PDF)">
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setDirty(true);
            }}
            className="input-base resize-y min-h-[80px]"
            rows={4}
            placeholder="Condizioni di pagamento, validità preventivo, ecc."
          />
        </Field>
      </div>

      <div className="fixed inset-x-0 bottom-0 sm:left-auto sm:bottom-6 sm:right-8 sm:inset-x-auto z-30 p-3 sm:p-0">
        <div className="bg-bg-card border-t sm:border border-border sm:rounded-lg px-4 py-3 shadow-card-hover flex items-center gap-2">
          {dirty && (
            <span className="text-[11px] text-yellow-400 hidden sm:inline">
              ● Modifiche non salvate
            </span>
          )}
          <PDFDownloadLink
            document={pdfDoc}
            fileName={`${kind}-${invoice.number}.pdf`}
            className="btn-secondary"
          >
            {({ loading }) =>
              loading ? (
                <>
                  <FileText className="w-4 h-4" /> Preparo PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Scarica PDF
                </>
              )
            }
          </PDFDownloadLink>
          <button onClick={handleSave} disabled={saving} className="btn-primary" type="button">
            <Save className="w-4 h-4" />
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      {!error && hint && <p className="mt-1 text-[10px] text-text-subtle">{hint}</p>}
    </div>
  );
}
