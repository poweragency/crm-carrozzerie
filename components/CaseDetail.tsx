"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowRight, RotateCcw, Save, Trash2, Lock } from "lucide-react";
import { Breadcrumb } from "./ui/Breadcrumb";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  CASE_PRODUCTION_STATUSES,
  CASE_STATUS_LABELS,
  CASE_STATUS_ORDER,
} from "@/lib/constants";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { formatDateTime, cn } from "@/lib/utils";
import { caseFormSchema, type CaseFormInputValues } from "@/lib/schemas";
import { CustomerPanel, type CustomerOption } from "./case/CustomerPanel";
import { VehiclePanel } from "./case/VehiclePanel";
import { CasePanel } from "./case/CasePanel";
import { DocumentPanel } from "./case/DocumentPanel";
import { CasePartsPanel } from "./case/CasePartsPanel";
import { InvoicesPanel } from "./case/InvoicesPanel";
import { NotifyButton } from "./case/NotifyButton";
import { NotifyWhatsAppButton } from "./case/NotifyWhatsAppButton";
import { CustomerFormModal } from "./customer/CustomerFormModal";
import { VehicleFormModal } from "./customer/VehicleFormModal";
import { useConfirm } from "./ConfirmDialog";
import { useUnsavedChangesWarning } from "@/lib/hooks/useUnsavedChangesWarning";
import type {
  Case,
  CasePart,
  CaseStatus,
  Customer,
  Document,
  Invoice,
  UserRole,
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
  initialParts: CasePart[];
  role: UserRole;
  isAdmin: boolean;
  workshopName: string | null;
}

type FieldErrors = Record<string, string>;

export function CaseDetail({
  initialCase,
  initialDocuments,
  initialCustomers,
  initialVehicles,
  initialInvoices,
  initialParts,
  role,
  isAdmin,
  workshopName,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();

  const [caseData, setCaseData] = useState(initialCase);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const invoices = initialInvoices;

  const [customers, setCustomers] = useState<CustomerOption[]>(initialCustomers);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    initialCase.customer_id ?? initialCase.customers?.id ?? null
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    initialCase.vehicle_id
  );

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  const customerVehicles = useMemo(
    () =>
      selectedCustomerId
        ? vehicles.filter((v) => v.customer_id === selectedCustomerId)
        : [],
    [vehicles, selectedCustomerId]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  const vehicleDescr = useMemo(() => {
    if (!selectedVehicle) return null;
    const parts = [
      selectedVehicle.make,
      selectedVehicle.model,
      selectedVehicle.plate,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [selectedVehicle]);

  const [caseForm, setCaseForm] = useState<CaseFormInputValues>({
    status: initialCase.status,
    description: initialCase.description ?? null,
    price: initialCase.price?.toString() ?? "",
    started_at: initialCase.started_at,
    due_at: initialCase.due_at,
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  // Controllo finale del titolare: la pratica resta in "controllo_titolare"
  // (il finitore ha finito) finché il titolare non spunta il controllo, che la
  // porta a "completata".
  const [manualCheck, setManualCheck] = useState(false);
  const canSeePostProduction = isAdmin || role === "owner";
  const requireOwnerCheck =
    canSeePostProduction && caseData.status === "controllo_titolare";

  useUnsavedChangesWarning(dirty);

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

    // Gate controllo titolare: per completare una pratica ancora in produzione
    // il titolare deve aver spuntato il controllo manuale.
    if (requireOwnerCheck && caseResult.data.status === "completata" && !manualCheck) {
      toast.error("Controllo del titolare richiesto", {
        description:
          "Spunta «Pratica controllata manualmente» prima di contrassegnarla come Completata.",
      });
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
          started_at: caseResult.data.started_at,
          due_at: caseResult.data.due_at,
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

  async function handleRestore() {
    const { data: updated, error } = await supabase
      .from("cases")
      .update({ archived_at: null, archived_reason: null })
      .eq("id", caseData.id)
      .select("*, customers(id, full_name, phone, email)")
      .single();
    if (error) {
      toast.error("Ripristino fallito", { description: error.message });
      return;
    }
    if (updated) setCaseData(updated as CaseWithCustomer);
    toast.success("Pratica ripresa");
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
        <div className="flex flex-col items-stretch sm:items-end gap-1.5">
          <div className="flex items-center gap-2">
            <NotifyButton
              caseId={caseData.id}
              customerEmail={selectedCustomer?.email ?? null}
              caseStatus={caseData.status}
              role={role}
              isAdmin={isAdmin}
            />
            <NotifyWhatsAppButton
              caseStatus={caseData.status}
              customerName={selectedCustomer?.full_name ?? null}
              customerPhone={selectedCustomer?.phone ?? null}
              vehicleDescr={vehicleDescr}
              workshopName={workshopName}
              role={role}
              isAdmin={isAdmin}
            />
            <button
              onClick={handleDeleteCase}
              className="btn-ghost text-red-400 hover:text-red-300"
              type="button"
            >
              <Trash2 className="w-4 h-4" /> Elimina pratica
            </button>
          </div>
          {(isAdmin || role === "owner") && caseData.status !== "completata" && (
            <p className="text-[11px] text-text-subtle sm:text-right">
              Contrassegna la pratica come <span className="font-medium">Completata</span>{" "}
              e premi <span className="font-medium">Salva</span> per poter notificare il
              cliente.
            </p>
          )}
        </div>
      </div>

      {caseData.archived_at && (
        <div className="card p-4 mb-5 bg-yellow-500/5 border-yellow-500/30 flex items-start gap-3">
          <Archive className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-yellow-400">
              Pratica incompleta
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {caseData.archived_reason === "lead_deleted"
                ? "Questa pratica è stata archiviata perché il lead di origine è stato eliminato. I dati (foto, preventivi, fatture) sono intatti."
                : "Questa pratica è archiviata. I dati sono intatti."}{" "}
              Riprendila per tornare a lavorarci.
            </p>
          </div>
          <button
            onClick={handleRestore}
            type="button"
            className="btn-secondary py-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Riprendi
          </button>
        </div>
      )}

      <div className="card p-4 mb-5">
        <div className="text-xs uppercase tracking-wide text-text-subtle mb-3 font-semibold">
          Stato pratica
        </div>
        <CaseStatusTimeline
          current={caseForm.status}
          canSeePostProduction={canSeePostProduction}
          requireOwnerCheck={requireOwnerCheck}
          ownerChecked={manualCheck}
          onOwnerCheckChange={(v) => {
            setManualCheck(v);
            // Spuntare il controllo porta la pratica a "completata"; togliendolo
            // torna in "controllo_titolare".
            setCaseForm((f) => ({
              ...f,
              status: v ? "completata" : "controllo_titolare",
            }));
            setDirty(true);
          }}
          onChange={(s) => {
            setCaseForm((f) => ({ ...f, status: s }));
            setDirty(true);
          }}
        />
      </div>

      <div className="card p-6 mb-5 space-y-6">
        <CustomerPanel
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelect={handleSelectCustomer}
          onCreateNew={() => setShowCustomerModal(true)}
          readOnly
        />

        <VehiclePanel
          vehicles={customerVehicles}
          selectedVehicleId={selectedVehicleId}
          onSelect={handleSelectVehicle}
          customerSelected={!!selectedCustomerId}
          onCreateNew={() => setShowVehicleModal(true)}
        />

        <CasePanel
          values={caseForm}
          errors={{
            status: errors["case.status"],
            description: errors["case.description"],
            price: errors["case.price"],
            started_at: errors["case.started_at"],
            due_at: errors["case.due_at"],
          }}
          onChange={(patch) => {
            setCaseForm((f) => ({ ...f, ...patch }));
            setDirty(true);
            for (const k of Object.keys(patch) as string[]) clearError(`case.${k}`);
          }}
        />
      </div>

      <div className="card p-5 mb-5">
        <CasePartsPanel caseId={caseData.id} initialParts={initialParts} role={role} />
      </div>

      <div className="card p-5 mb-5">
        <DocumentPanel
          caseId={caseData.id}
          documents={documents}
          onChange={setDocuments}
        />
      </div>

      <div className="card p-5 mb-5">
        <InvoicesPanel caseId={caseData.id} invoices={invoices} parentDirty={dirty} />
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

      {showCustomerModal && (
        <CustomerFormModal
          onClose={() => setShowCustomerModal(false)}
          onSaved={(c: Customer) => {
            setCustomers((prev) => [
              ...prev,
              { id: c.id, full_name: c.full_name, phone: c.phone, email: c.email },
            ]);
            setSelectedCustomerId(c.id);
            setSelectedVehicleId(null);
            setDirty(true);
            setShowCustomerModal(false);
          }}
        />
      )}

      {showVehicleModal && selectedCustomerId && (
        <VehicleFormModal
          customerId={selectedCustomerId}
          onClose={() => setShowVehicleModal(false)}
          onSaved={(v) => {
            setVehicles((prev) => [...prev, v]);
            setSelectedVehicleId(v.id);
            setDirty(true);
            setShowVehicleModal(false);
          }}
        />
      )}
    </div>
  );
}

const POST_PRODUCTION = new Set<CaseStatus>(["completata", "consegnata", "liquidato"]);

function CaseStatusTimeline({
  current,
  canSeePostProduction,
  requireOwnerCheck,
  ownerChecked,
  onOwnerCheckChange,
  onChange,
}: {
  current: CaseStatus;
  canSeePostProduction: boolean;
  requireOwnerCheck: boolean;
  ownerChecked: boolean;
  onOwnerCheckChange: (v: boolean) => void;
  onChange: (s: CaseStatus) => void;
}) {
  // Il titolare deve spuntare il controllo manuale prima di poter contrassegnare
  // gli step post-produzione (a partire da Completata).
  const stepLocked = (s: CaseStatus) =>
    requireOwnerCheck && !ownerChecked && POST_PRODUCTION.has(s);
  const handleStep = (s: CaseStatus) => {
    if (stepLocked(s)) {
      toast.error("Controllo del titolare richiesto", {
        description: "Spunta «Pratica controllata manualmente» qui sopra.",
      });
      return;
    }
    onChange(s);
  };
  // Lo staff vede solo i tre step di produzione. La parte post-produzione
  // (completata/consegnata/liquidato) è riservata all'owner — sia in lettura
  // sia in scrittura. Lo staff può però "chiudere" la lavorazione tramite il
  // bottone Concludi sotto la timeline: imposta lo stato a "completata" e
  // questo fa scattare il trigger DB che notifica l'owner.
  const visibleSteps = canSeePostProduction
    ? CASE_STATUS_ORDER
    : CASE_PRODUCTION_STATUSES;
  const currentIdx = visibleSteps.indexOf(current);
  const isHandedOff = !canSeePostProduction && currentIdx === -1;
  // Per la barra di progresso: se la pratica è già oltre la produzione (staff
  // che guarda una pratica passata all'owner), mostriamo tutto come completato.
  const progressIdx = isHandedOff ? visibleSteps.length - 1 : currentIdx;

  return (
    <div>
      {requireOwnerCheck && (
        <label
          className={cn(
            "flex items-start gap-2 mb-4 p-2.5 rounded-md border cursor-pointer select-none transition-colors",
            ownerChecked
              ? "border-status-success/40 bg-status-success/5"
              : "border-yellow-500/40 bg-yellow-500/5"
          )}
        >
          <input
            type="checkbox"
            checked={ownerChecked}
            onChange={(e) => onOwnerCheckChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-accent shrink-0"
          />
          <span className="text-xs leading-snug">
            <span className="font-medium">
              Pratica controllata manualmente dal titolare
            </span>
            <span className="block text-text-subtle">
              Obbligatorio prima di contrassegnare la pratica come Completata.
            </span>
          </span>
        </label>
      )}
      <div className="relative">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {visibleSteps.map((s, i) => {
            const isCurrent = !isHandedOff && i === currentIdx;
            const isDone = isHandedOff || i < currentIdx;
            return (
              <div key={s} className="flex-1 flex flex-col items-center min-w-0">
                <button
                  onClick={() => handleStep(s)}
                  type="button"
                  className={cn(
                    "relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-semibold transition-all",
                    isCurrent &&
                      "bg-accent border-accent text-white shadow-[0_0_0_4px_rgba(249,115,22,0.2)]",
                    isDone && "bg-accent/30 border-accent/60 text-accent",
                    !isCurrent &&
                      !isDone &&
                      "bg-bg-hover border-border text-text-subtle hover:border-border-hover hover:text-text",
                    stepLocked(s) && "opacity-40 cursor-not-allowed hover:border-border"
                  )}
                  aria-label={CASE_STATUS_LABELS[s]}
                  title={
                    stepLocked(s)
                      ? "Spunta il controllo del titolare per sbloccare"
                      : undefined
                  }
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
              progressIdx > 0
                ? `${(progressIdx / (visibleSteps.length - 1)) * 80}%`
                : "0%",
          }}
          aria-hidden="true"
        />
      </div>

      {/* Staff: bottone "Concludi" quando la finitura è il current step.
       *
       * Cambia lo stato in 'completata' (= primo step post-produzione). Il
       * trigger DB notify_finitura_done si occupa di avvisare l'owner. */}
      {!canSeePostProduction && current === "finitura" && (
        <button
          type="button"
          onClick={() => onChange("completata")}
          className="btn-secondary w-full sm:w-auto mt-4"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          Concludi finitura e passa al titolare
        </button>
      )}

      {/* Staff: indicatore quando la pratica è già stata passata all'owner.
       *
       * Lo stato resta visibile per coerenza ma non è modificabile dai
       * dipendenti — è il titolare che gestisce consegna e liquidazione. */}
      {isHandedOff && (
        <div className="mt-4 flex items-center gap-2 text-[11px] text-text-muted bg-bg-hover/50 border border-border rounded-md px-3 py-2">
          <Lock className="w-3 h-3 text-text-subtle" />
          Lavorazione conclusa — in carico al titolare per consegna e liquidazione.
        </div>
      )}
    </div>
  );
}
