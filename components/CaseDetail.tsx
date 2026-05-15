"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER } from "@/lib/constants";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { formatDateTime, cn } from "@/lib/utils";
import {
  customerFormSchema,
  vehicleFormSchema,
  caseFormSchema,
  type CustomerFormValues,
  type VehicleFormInputValues,
  type CaseFormInputValues,
} from "@/lib/schemas";
import { CustomerPanel } from "./case/CustomerPanel";
import { VehiclePanel } from "./case/VehiclePanel";
import { CasePanel } from "./case/CasePanel";
import { DocumentPanel } from "./case/DocumentPanel";
import { NotesPanel } from "./case/NotesPanel";
import { InvoicesPanel } from "./case/InvoicesPanel";
import { NotifyButton } from "./case/NotifyButton";
import { useConfirm } from "./ConfirmDialog";
import type {
  Case,
  CaseStatus,
  Document,
  Invoice,
  Note,
  Vehicle,
} from "@/types/database.types";

type CaseWithCustomer = Case & {
  customers: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

interface Props {
  initialCase: CaseWithCustomer;
  initialDocuments: Document[];
  initialNotes: Note[];
  initialVehicles: Vehicle[];
  initialInvoices: Invoice[];
}

type FieldErrors = Record<string, string>;

function vehicleToForm(v: Vehicle | null): VehicleFormInputValues {
  return {
    make: v?.make ?? null,
    model: v?.model ?? null,
    plate: v?.plate ?? null,
    year: v?.year != null ? String(v.year) : null,
    color: v?.color ?? null,
    vin: v?.vin ?? null,
    notes: v?.notes ?? null,
  };
}

const emptyVehicleForm: VehicleFormInputValues = {
  make: null,
  model: null,
  plate: null,
  year: null,
  color: null,
  vin: null,
  notes: null,
};

export function CaseDetail({
  initialCase,
  initialDocuments,
  initialNotes,
  initialVehicles,
  initialInvoices,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();

  const [caseData, setCaseData] = useState(initialCase);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const invoices = initialInvoices;

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    initialCase.vehicle_id
  );
  const initialSelectedVehicle =
    initialVehicles.find((v) => v.id === initialCase.vehicle_id) ?? null;

  const [customerForm, setCustomerForm] = useState<CustomerFormValues>({
    full_name: initialCase.customers?.full_name ?? "",
    phone: initialCase.customers?.phone ?? null,
    email: initialCase.customers?.email ?? null,
  });
  const [vehicleForm, setVehicleForm] = useState<VehicleFormInputValues>(
    vehicleToForm(initialSelectedVehicle)
  );
  const [caseForm, setCaseForm] = useState<CaseFormInputValues>({
    status: initialCase.status,
    insurance_company: initialCase.insurance_company ?? null,
    description: initialCase.description ?? null,
    price: initialCase.price?.toString() ?? "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
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

  function selectVehicle(id: string | null) {
    setSelectedVehicleId(id);
    const v = id ? vehicles.find((x) => x.id === id) ?? null : null;
    setVehicleForm(id ? vehicleToForm(v) : emptyVehicleForm);
    setDirty(true);
  }

  function clearError(path: string) {
    if (!errors[path]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }

  async function handleSave() {
    setErrors({});

    const customerResult = customerFormSchema.safeParse(customerForm);
    const vehicleHasAny = Object.values(vehicleForm).some((v) => v !== null && v !== "");
    const vehicleResult = vehicleHasAny
      ? vehicleFormSchema.safeParse(vehicleForm)
      : { success: true as const, data: null };
    const caseResult = caseFormSchema.safeParse({
      status: caseForm.status,
      insurance_company: caseForm.insurance_company,
      description: caseForm.description,
      price: caseForm.price,
    });

    const flat: FieldErrors = {};
    if (!customerResult.success) {
      for (const i of customerResult.error.issues) flat[`customer.${String(i.path[0])}`] = i.message;
    }
    if (!vehicleResult.success) {
      for (const i of vehicleResult.error.issues) flat[`vehicle.${String(i.path[0])}`] = i.message;
    }
    if (!caseResult.success) {
      for (const i of caseResult.error.issues) flat[`case.${String(i.path[0])}`] = i.message;
    }
    if (Object.keys(flat).length > 0) {
      setErrors(flat);
      toast.error("Controlla i campi evidenziati");
      return;
    }

    if (!customerResult.success || !caseResult.success || !vehicleResult.success) return;

    setSaving(true);
    try {
      if (caseData.customers?.id) {
        const { error: custErr } = await supabase
          .from("customers")
          .update({
            full_name: customerResult.data.full_name,
            phone: customerResult.data.phone,
            email: customerResult.data.email,
          })
          .eq("id", caseData.customers.id);
        if (custErr) throw new Error(`Cliente: ${custErr.message}`);
      }

      let finalVehicleId: string | null = selectedVehicleId;
      const vehicleData = vehicleResult.data;
      if (vehicleData && caseData.customers?.id) {
        if (selectedVehicleId) {
          const { data: updated, error: vehErr } = await supabase
            .from("vehicles")
            .update(vehicleData)
            .eq("id", selectedVehicleId)
            .select()
            .single();
          if (vehErr) throw new Error(`Veicolo: ${vehErr.message}`);
          if (updated) {
            setVehicles((vs) => vs.map((v) => (v.id === updated.id ? updated : v)));
          }
        } else {
          const { data: created, error: vehErr } = await supabase
            .from("vehicles")
            .insert({ ...vehicleData, customer_id: caseData.customers.id })
            .select()
            .single();
          if (vehErr) throw new Error(`Veicolo: ${vehErr.message}`);
          if (created) {
            setVehicles((vs) => [...vs, created]);
            finalVehicleId = created.id;
            setSelectedVehicleId(created.id);
          }
        }
      }

      const { data: updatedCase, error: caseErr } = await supabase
        .from("cases")
        .update({
          status: caseResult.data.status,
          insurance_company: caseResult.data.insurance_company,
          description: caseResult.data.description,
          price: caseResult.data.price,
          vehicle_id: finalVehicleId,
        })
        .eq("id", caseData.id)
        .select("*, customers(id, full_name, phone, email)")
        .single();
      if (caseErr) throw new Error(`Pratica: ${caseErr.message}`);
      if (updatedCase) setCaseData(updatedCase as CaseWithCustomer);

      toast.success("Modifiche salvate");
      setSavedAt(Date.now());
      setDirty(false);
      setTimeout(() => setSavedAt(null), 2500);
    } catch (e) {
      toast.error("Salvataggio fallito", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCase() {
    const photoCount = documents.filter((d) => d.mime_type?.startsWith("image/")).length;
    const fileCount = documents.length - photoCount;
    const invoiceCount = invoices.length;
    const parts: string[] = [];
    if (photoCount > 0) parts.push(`${photoCount} ${photoCount === 1 ? "foto" : "foto"}`);
    if (fileCount > 0) parts.push(`${fileCount} ${fileCount === 1 ? "file" : "file"}`);
    if (invoiceCount > 0)
      parts.push(`${invoiceCount} preventivi/fatture`);
    if (notes.length > 0)
      parts.push(`${notes.length} ${notes.length === 1 ? "nota" : "note"}`);

    const detail =
      parts.length > 0
        ? `Verranno eliminati anche: ${parts.join(", ")}.\n\n`
        : "";
    const confirmed = await confirm({
      title: `Eliminare la pratica di ${
        customerForm.full_name || "questo cliente"
      }?`,
      description: `${detail}Azione irreversibile.`,
      confirmLabel: "Elimina pratica",
      variant: "danger",
    });
    if (!confirmed) return;
    const { error } = await supabase.from("cases").delete().eq("id", caseData.id);
    if (error) {
      toast.error("Eliminazione fallita", { description: error.message });
      return;
    }
    toast.success("Pratica eliminata");
    router.push("/cases");
  }

  return (
    <div className="max-w-4xl mx-auto p-8 pb-40 sm:pb-32">
      <div className="sticky top-0 -mx-8 px-8 py-2 bg-bg/95 backdrop-blur z-20 border-b border-border/50 mb-4">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="w-4 h-4" /> Pratiche
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {customerForm.full_name || "Pratica senza cliente"}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-text-muted flex-wrap">
            <span>Aperta il {formatDateTime(caseData.created_at)}</span>
            {caseData.updated_at !== caseData.created_at && (
              <span className="text-text-subtle">
                · Ultimo aggiornamento {formatDateTime(caseData.updated_at)}
              </span>
            )}
            <CaseStatusBadge status={caseData.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotifyButton
            caseId={caseData.id}
            customerEmail={customerForm.email}
          />
          <button
            onClick={handleDeleteCase}
            className="btn-ghost text-red-400 hover:text-red-300"
            type="button"
          >
            <Trash2 className="w-4 h-4" /> Elimina pratica
          </button>
        </div>
      </div>

      <div className="card p-4 mb-5">
        <div className="text-xs text-text-muted mb-2">Stato pratica</div>
        <div className="flex flex-wrap gap-2">
          {CASE_STATUS_ORDER.map((s: CaseStatus) => (
            <button
              key={s}
              onClick={() => {
                setCaseForm((f) => ({ ...f, status: s }));
                setDirty(true);
              }}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors border",
                caseForm.status === s
                  ? "bg-accent border-accent text-white"
                  : "bg-bg-hover border-border text-text-muted hover:text-text hover:border-border-hover"
              )}
              type="button"
            >
              {CASE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6 mb-5 space-y-6">
        <CustomerPanel
          values={customerForm}
          errors={{
            full_name: errors["customer.full_name"],
            phone: errors["customer.phone"],
            email: errors["customer.email"],
          }}
          onChange={(patch) => {
            setCustomerForm((f) => ({ ...f, ...patch }));
            setDirty(true);
            for (const k of Object.keys(patch) as string[]) clearError(`customer.${k}`);
          }}
        />

        <VehiclePanel
          values={vehicleForm}
          errors={{
            make: errors["vehicle.make"],
            model: errors["vehicle.model"],
            plate: errors["vehicle.plate"],
            year: errors["vehicle.year"],
            color: errors["vehicle.color"],
            vin: errors["vehicle.vin"],
          }}
          onChange={(patch) => {
            setVehicleForm((f) => ({ ...f, ...patch }));
            setDirty(true);
            for (const k of Object.keys(patch) as string[]) clearError(`vehicle.${k}`);
          }}
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={selectVehicle}
        />

        <CasePanel
          values={caseForm}
          errors={{
            status: errors["case.status"],
            insurance_company: errors["case.insurance_company"],
            description: errors["case.description"],
            price: errors["case.price"],
          }}
          onChange={(patch) => {
            setCaseForm((f) => ({ ...f, ...patch }));
            setDirty(true);
            for (const k of Object.keys(patch) as string[]) clearError(`case.${k}`);
          }}
        />
      </div>

      <div className="card p-5 mb-5">
        <DocumentPanel
          caseId={caseData.id}
          documents={documents}
          onChange={setDocuments}
        />
      </div>

      <div className="card p-5 mb-5">
        <InvoicesPanel caseId={caseData.id} invoices={invoices} />
      </div>

      <div className="card p-5 mb-5">
        <NotesPanel caseId={caseData.id} notes={notes} onChange={setNotes} />
      </div>

      <div className="fixed inset-x-0 bottom-0 sm:left-auto sm:right-8 sm:bottom-6 sm:inset-x-auto z-30 p-3 sm:p-0">
        <div className="bg-bg-card border-t sm:border border-border sm:rounded-lg px-4 py-3 shadow-card-hover flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
          <span className="text-xs">
            {savedAt ? (
              <span className="text-emerald-400">✓ Salvato</span>
            ) : dirty ? (
              <span className="text-yellow-400">● Modifiche non salvate</span>
            ) : (
              <span className="text-text-subtle">Tutto salvato</span>
            )}
          </span>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="btn-primary"
            type="button"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvataggio..." : "Salva tutto"}
          </button>
        </div>
      </div>
    </div>
  );
}
