"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Car, Check, Lock, Mail, Phone, User } from "lucide-react";
import { Breadcrumb } from "./ui/Breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { DocumentPanel } from "./case/DocumentPanel";
import {
  CASE_PRODUCTION_STATUSES,
  CASE_STATUS_LABELS,
  CASE_STATUS_ORDER,
} from "@/lib/constants";
import { PHASE_DONE_FIELDS, nextPhase, rolePhase } from "@/lib/roles";
import { cn, formatDateTime } from "@/lib/utils";
import type {
  Case,
  Document,
  DocumentPhase,
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
  vehicle: Vehicle | null;
  role: UserRole;
}

export function CaseWorkbench({ initialCase, initialDocuments, vehicle, role }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [caseData, setCaseData] = useState(initialCase);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [advancing, setAdvancing] = useState(false);

  const myPhase = rolePhase(role) as DocumentPhase | null;
  const customer = caseData.customers;
  const status = caseData.status;
  const isMyPhase = myPhase != null && status === myPhase;
  const next = myPhase ? nextPhase(myPhase) : null;

  const photosForMyPhase = useMemo(
    () =>
      documents.filter(
        (d) => d.phase === myPhase && (d.mime_type?.startsWith("image/") ?? false)
      ),
    [documents, myPhase]
  );
  const hasPhoto = photosForMyPhase.length > 0;

  async function handleAdvance() {
    if (!myPhase || !next) return;
    if (!hasPhoto) {
      toast.error("Carica prima una foto", {
        description: `Serve almeno una foto della fase ${CASE_STATUS_LABELS[
          myPhase
        ].toLowerCase()} completata per poter avanzare.`,
      });
      return;
    }
    setAdvancing(true);
    const { data: updated, error } = await supabase
      .from("cases")
      .update({ status: next })
      .eq("id", caseData.id)
      .select("*, customers(id, full_name, phone, email)")
      .single();
    setAdvancing(false);
    if (error) {
      const msg = error.message.includes("photo_required")
        ? "Carica almeno una foto della fase prima di avanzare."
        : error.message.includes("forbidden_phase")
          ? "Questa pratica non è (più) nella tua fase."
          : error.message;
      toast.error("Passaggio non riuscito", { description: msg });
      return;
    }
    if (updated) setCaseData(updated as CaseWithCustomer);
    toast.success(
      `Fase ${CASE_STATUS_LABELS[myPhase].toLowerCase()} completata e passata avanti`
    );
    router.push("/cases");
    router.refresh();
  }

  const headerName = customer?.full_name ?? "Pratica";
  const vehicleDescr = vehicle
    ? [vehicle.make, vehicle.model, vehicle.plate].filter(Boolean).join(" · ")
    : null;
  const currentIdx = CASE_STATUS_ORDER.indexOf(status);

  return (
    <div className="max-w-3xl mx-auto p-8 pb-40 sm:pb-32">
      <div className="sticky top-0 -mx-8 px-8 py-2 bg-bg/95 backdrop-blur z-20 border-b border-border/50 mb-4">
        <Breadcrumb
          items={[{ label: "Le mie pratiche", href: "/cases" }, { label: headerName }]}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{headerName}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-text-muted flex-wrap">
            <span>Aperta il {formatDateTime(caseData.created_at)}</span>
            <CaseStatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Contesto cliente / veicolo (sola lettura) */}
      <div className="card p-5 mb-5 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-subtle mb-2 font-semibold flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Cliente
          </div>
          <div className="text-sm font-medium">{customer?.full_name ?? "—"}</div>
          <div className="mt-1 space-y-0.5 text-xs text-text-muted">
            {customer?.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> {customer.phone}
              </div>
            )}
            {customer?.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> {customer.email}
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-text-subtle mb-2 font-semibold flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5" /> Veicolo
          </div>
          {vehicle ? (
            <div className="text-sm">
              {vehicleDescr || "—"}
              {(vehicle.year || vehicle.color) && (
                <div className="mt-1 text-xs text-text-muted">
                  {[vehicle.year, vehicle.color].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-text-subtle">Nessun veicolo associato</div>
          )}
          {caseData.description && (
            <div className="mt-3 text-xs text-text-muted whitespace-pre-wrap">
              {caseData.description}
            </div>
          )}
        </div>
      </div>

      {/* Checklist fasi di lavorazione */}
      <div className="card p-4 mb-5">
        <div className="text-xs uppercase tracking-wide text-text-subtle mb-3 font-semibold">
          Avanzamento lavorazione
        </div>
        <ol className="space-y-2">
          {CASE_PRODUCTION_STATUSES.map((ph) => {
            const phaseIdx = CASE_STATUS_ORDER.indexOf(ph);
            const doneAt = caseData[
              PHASE_DONE_FIELDS[ph as keyof typeof PHASE_DONE_FIELDS].at
            ] as string | null;
            const isDone = !!doneAt || phaseIdx < currentIdx;
            const isCurrent = ph === status;
            return (
              <li key={ph} className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-semibold shrink-0",
                    isDone
                      ? "bg-status-success/20 border-status-success/60 text-status-success"
                      : isCurrent
                        ? "bg-accent border-accent text-white"
                        : "bg-bg-hover border-border text-text-subtle"
                  )}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : null}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isCurrent
                      ? "font-semibold text-accent"
                      : isDone
                        ? "text-text-muted"
                        : "text-text-subtle"
                  )}
                >
                  {CASE_STATUS_LABELS[ph]}
                </span>
                {doneAt && (
                  <span className="ml-auto text-[11px] text-text-subtle">
                    fatto il {formatDateTime(doneAt)}
                  </span>
                )}
                {isCurrent && !isDone && (
                  <span className="ml-auto text-[11px] text-accent">in lavorazione</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Foto della propria fase */}
      {isMyPhase && myPhase ? (
        <div className="card p-5 mb-5">
          <DocumentPanel
            caseId={caseData.id}
            documents={documents}
            onChange={setDocuments}
            phases={[myPhase]}
          />
        </div>
      ) : (
        <div className="card p-4 mb-5 flex items-center gap-2 text-sm text-text-muted">
          <Lock className="w-4 h-4 text-text-subtle" />
          Questa pratica non è nella tua fase di lavorazione.
        </div>
      )}

      {/* Barra azione: avanza fase */}
      {isMyPhase && next && (
        <div className="fixed inset-x-0 bottom-0 sm:left-auto sm:right-8 sm:bottom-6 sm:inset-x-auto z-30 p-3 sm:p-0">
          <div className="bg-bg-card border-t sm:border border-border sm:rounded-lg px-4 py-3 shadow-card-hover flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
            <span className="text-xs">
              {hasPhoto ? (
                <span className="text-emerald-400">✓ Foto caricata</span>
              ) : (
                <span className="text-yellow-400">● Carica la foto per avanzare</span>
              )}
            </span>
            <button
              onClick={handleAdvance}
              disabled={advancing || !hasPhoto}
              className="btn-primary"
              type="button"
              title={
                hasPhoto
                  ? undefined
                  : "Carica almeno una foto della fase prima di avanzare"
              }
            >
              <ArrowRight className="w-4 h-4" />
              {advancing
                ? "Attendere..."
                : `Completa ${CASE_STATUS_LABELS[myPhase!].toLowerCase()} → ${CASE_STATUS_LABELS[next].toLowerCase()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
