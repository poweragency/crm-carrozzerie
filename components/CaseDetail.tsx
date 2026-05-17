"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { Breadcrumb } from "./ui/Breadcrumb";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER } from "@/lib/constants";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { formatDateTime, cn } from "@/lib/utils";
import { caseFormSchema, type CaseFormInputValues } from "@/lib/schemas";
import { CustomerPanel, type CustomerOption } from "./case/CustomerPanel";
import { VehiclePanel } from "./case/VehiclePanel";
import { CasePanel } from "./case/CasePanel";
import { DocumentPanel } from "./case/DocumentPanel";
import { InvoicesPanel } from "./case/InvoicesPanel";
import { NotifyButton } from "./case/NotifyButton";
import { useConfirm } from "./ConfirmDialog";
import type {
  Case,
  CaseStatus,
  Document,
  Invoice,
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
  initialCustomers: CustomerOption[];
  initialVehicles: Vehicle[];
  initialInvoices: Invoice[];
}

type FieldErrors = Record<string, string>;

export function CaseDetail({
  initialCase,
  initialDocuments,
  initialCustomers,
  initialVehicles,
  initialInvoices,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();

  const [caseData, setCaseData] = useState(initialCase);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const invoices = initialInvoices;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    initialCase.customer_id ?? initialCase.customers?.id ?? null
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    initialCase.vehicle_id
  );

  const customerVehicles = useMemo(
    () =>
      selectedCustomerId
        ? initialVehicles.filter((v) => v.customer_id === selectedCustomerId)
        : [],
    [initialVehicles, selectedCustomerId]
  );

  const selectedCustomer = useMemo(
    () => initialCustomers.find((c) => c.id === selectedCustomerId) ?? null,
    [initialCustomers, selectedCustomerId]
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

  function handleSelectCustomer(id: string | null) {
    setSelectedCustomerId(id);
    // Reset veicolo se il cliente cambia
    setSelectedVehicleId(null);
    setDirty(true);
  }

  function handleSelectVehicle(id: string | null) {
    setSelectedVehicleId(id);
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

    if (!selectedCustomerId) {
      toast.error("Seleziona un cliente prima di salvare");
      return;
    }

    const caseResult = caseFormSchema.safeParse({
      status: caseForm.status,
      insurance_company: caseForm.insurance_company,
      description: caseForm.description,
      price: caseForm.price,
    });

    if (!caseResult.success) {
      const flat: FieldErrors = {};
      for (const i of caseResult.error.issues)
        flat[`case.${String(i.path[0])}`] = i.message;
      setErrors(flat);
      toast.error("Controlla i campi evidenziati");
      return;
    }

    setSaving(true);
    try {
      const { data: updatedCase, error: caseErr } = await supabase
        .from("cases")
        .update({
          status: caseResult.data.status,
          description: caseResult.data.description,
          price: caseResult.data.price,
          customer_id: selectedCustomerId,
          vehicle_id: selectedVehicleId,
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
    const invoiceCount = invoices.length;
    const parts: string[] = [];
    if (photoCount > 0) parts.push(`${photoCount} ${photoCount === 1 ? "foto" : "foto"}`);
    if (invoiceCount > 0) parts.push(`${invoiceCount} preventivi/fatture`);

    const detail =
      parts.length > 0 ? `Verranno eliminati anche: ${parts.join(", ")}.\n\n` : "";
    const confirmed = await confirm({
      title: `Eliminare la pratica di ${
        selectedCustomer?.full_name || "questo cliente"
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

  const headerName = selectedCustomer?.full_name ?? "Pratica senza cliente";

  return (
    <div className="max-w-4xl mx-auto p-8 pb-40 sm:pb-32">
      <div className="sticky top-0 -mx-8 px-8 py-2 bg-bg/95 backdrop-blur z-20 border-b border-border/50 mb-4">
        <Breadcrumb
          items={[{ label: "Pratiche", href: "/cases" }, { label: headerName }]}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{headerName}</h1>
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
            customerEmail={selectedCustomer?.email ?? null}
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
        <div className="text-xs uppercase tracking-wide text-text-subtle mb-3 font-semibold">
          Stato pratica
        </div>
        <CaseStatusTimeline
          current={caseForm.status}
          onChange={(s) => {
            setCaseForm((f) => ({ ...f, status: s }));
            setDirty(true);
          }}
        />
      </div>

      <div className="card p-6 mb-5 space-y-6">
        <CustomerPanel
          customers={initialCustomers}
          selectedCustomerId={selectedCustomerId}
          onSelect={handleSelectCustomer}
        />

        <VehiclePanel
          vehicles={customerVehicles}
          selectedVehicleId={selectedVehicleId}
          onSelect={handleSelectVehicle}
          customerSelected={!!selectedCustomerId}
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

function CaseStatusTimeline({
  current,
  onChange,
}: {
  current: CaseStatus;
  onChange: (s: CaseStatus) => void;
}) {
  const currentIdx = CASE_STATUS_ORDER.indexOf(current);
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {CASE_STATUS_ORDER.map((s, i) => {
          const isCurrent = i === currentIdx;
          const isDone = i < currentIdx;
          return (
            <div key={s} className="flex-1 flex flex-col items-center min-w-0">
              <button
                onClick={() => onChange(s)}
                type="button"
                className={cn(
                  "relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-semibold transition-all",
                  isCurrent &&
                    "bg-accent border-accent text-white shadow-[0_0_0_4px_rgba(249,115,22,0.2)]",
                  isDone && "bg-accent/30 border-accent/60 text-accent",
                  !isCurrent &&
                    !isDone &&
                    "bg-bg-hover border-border text-text-subtle hover:border-border-hover hover:text-text"
                )}
                aria-label={CASE_STATUS_LABELS[s]}
              >
                {isDone ? "✓" : i + 1}
              </button>
              <span
                className={cn(
                  "text-[10px] mt-1.5 text-center truncate w-full",
                  isCurrent
                    ? "text-accent font-semibold"
                    : isDone
                      ? "text-text-muted"
                      : "text-text-subtle"
                )}
              >
                {CASE_STATUS_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>
      <div
        className="absolute top-3.5 left-[10%] right-[10%] h-px bg-border -z-0"
        aria-hidden="true"
      />
      <div
        className="absolute top-3.5 left-[10%] h-px bg-accent/60 -z-0 transition-all"
        style={{
          width:
            currentIdx > 0
              ? `${(currentIdx / (CASE_STATUS_ORDER.length - 1)) * 80}%`
              : "0%",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
