"use client";

import { toast } from "sonner";
import { CASE_STATUS_LABELS } from "@/lib/constants";
import { CASE_NOTIFY_MESSAGES } from "@/lib/notify-messages";
import type { CaseStatus, UserRole } from "@/types/database.types";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28z" />
    </svg>
  );
}

interface Props {
  caseStatus: CaseStatus;
  customerName: string | null;
  customerPhone: string | null;
  vehicleDescr: string | null;
  workshopName: string | null;
  role: UserRole;
  isAdmin?: boolean;
}

// Italia come default: se il numero non ha prefisso internazionale,
// assumiamo +39 (mobile a 9-10 cifre che inizia per 3).
function normalizeForWa(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  let s = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  if (s.startsWith("00")) s = s.slice(2);
  if (/^3\d{8,9}$/.test(s)) s = "39" + s;
  return s.length >= 8 ? s : null;
}

export function NotifyWhatsAppButton({
  caseStatus,
  customerName,
  customerPhone,
  vehicleDescr,
  workshopName,
  role,
  isAdmin = false,
}: Props) {
  if (!isAdmin && role !== "owner") return null;

  const isCompleted = caseStatus === "completata";
  const waNumber = customerPhone ? normalizeForWa(customerPhone) : null;
  const disabled = !isCompleted || !waNumber;

  const tooltip = !isCompleted
    ? "Disponibile quando la pratica è 'Completata'"
    : !customerPhone
      ? "Cliente senza numero di telefono"
      : !waNumber
        ? "Numero di telefono non valido per WhatsApp"
        : `Apri WhatsApp per scrivere a ${customerPhone}`;

  function handleClick(e: React.MouseEvent) {
    if (disabled) {
      e.preventDefault();
      if (!isCompleted) {
        toast.error("Pratica non completata", {
          description: "Puoi inviare la notifica solo quando lo stato è 'Completata'.",
        });
      } else if (!customerPhone) {
        toast.error("Cliente senza telefono", {
          description: "Aggiungi il numero di telefono del cliente.",
        });
      } else {
        toast.error("Numero non valido", {
          description: "Il numero del cliente non è in un formato valido per WhatsApp.",
        });
      }
      return;
    }
  }

  const greeting = customerName ? `Salve ${customerName},` : "Salve,";
  const lines = [
    greeting,
    "",
    CASE_NOTIFY_MESSAGES[caseStatus],
    vehicleDescr ? `\nVeicolo: ${vehicleDescr}` : null,
    "",
    workshopName ? `Cordiali saluti,\n${workshopName}` : null,
  ].filter((l) => l !== null);
  const text = lines.join("\n");

  const href = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`
    : "#";

  if (disabled) {
    return (
      <button
        onClick={handleClick}
        disabled
        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
        title={tooltip}
      >
        <WhatsAppIcon className="w-4 h-4" />
        Notifica cliente via whatsapp
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-secondary text-center"
      title={tooltip}
      aria-label={`Notifica via WhatsApp — pratica ${CASE_STATUS_LABELS[caseStatus]}`}
    >
      <WhatsAppIcon className="w-4 h-4" />
      Notifica cliente via whatsapp
    </a>
  );
}
