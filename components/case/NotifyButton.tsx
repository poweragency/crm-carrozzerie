"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import type { CaseStatus, UserRole } from "@/types/database.types";

interface Props {
  caseId: string;
  customerEmail: string | null;
  caseStatus: CaseStatus;
  role: UserRole;
  isAdmin?: boolean;
}

export function NotifyButton({
  caseId,
  customerEmail,
  caseStatus,
  role,
  isAdmin = false,
}: Props) {
  const [sending, setSending] = useState(false);

  // Solo owner/admin: lo staff non vede il pulsante (anche la route lato
  // server rifiuta).
  if (!isAdmin && role !== "owner") return null;

  const isCompleted = caseStatus === "completata";
  const hasEmail = !!customerEmail;
  const disabled = sending || !isCompleted || !hasEmail;

  const tooltip = !isCompleted
    ? "Disponibile quando la pratica è 'Completata'"
    : !hasEmail
      ? "Cliente senza email"
      : `Invia notifica via email a ${customerEmail}`;

  async function handleNotify() {
    if (!isCompleted) {
      toast.error("Pratica non completata", {
        description: "Puoi inviare la notifica solo quando lo stato è 'Completata'.",
      });
      return;
    }
    if (!hasEmail) {
      toast.error("Cliente senza email", {
        description: "Aggiungi l'indirizzo email del cliente prima di inviare.",
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/notifications/case-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });
      const json = (await res.json().catch(() => null)) as
        | { sent: true; to: string }
        | { sent: false; reason?: string; preview?: { subject: string }; error?: string }
        | null;

      if (!res.ok) {
        toast.error("Invio fallito", {
          description: (json as { error?: string } | null)?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      if (json?.sent) {
        toast.success("Email inviata", { description: `A ${json.to}` });
      } else if (json && json.sent === false && json.reason === "email_not_configured") {
        toast.warning("Email non configurata", {
          description:
            "Imposta RESEND_API_KEY e RESEND_FROM_EMAIL per inviare email reali.",
        });
      } else {
        toast.error("Invio fallito");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      onClick={handleNotify}
      disabled={disabled}
      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      type="button"
      title={tooltip}
    >
      <Mail className="w-4 h-4" />
      {sending ? "Invio..." : "Notifica cliente via mail"}
    </button>
  );
}
