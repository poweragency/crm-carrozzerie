import type { CaseStatus } from "@/types/database.types";

// Testi base per la notifica cliente (email + WhatsApp). Condivisi tra
// la route server e i pulsanti client per evitare divergenze.
export const CASE_NOTIFY_MESSAGES: Record<CaseStatus, string> = {
  preparazione:
    "Il Suo veicolo è in fase di preparazione (carteggiatura e mascheratura) prima della verniciatura. La aggiorneremo a breve.",
  verniciatura:
    "Il Suo veicolo è in cabina per la verniciatura. Le scriveremo non appena la fase sarà completata.",
  finitura:
    "Il Suo veicolo è in fase di finitura (lucidatura e controlli qualità). Manca poco al ritiro.",
  completata:
    "La riparazione del Suo veicolo è completata. Può venire a ritirarlo negli orari di apertura dell'officina.",
  consegnata:
    "Confermiamo la consegna del Suo veicolo. La ringraziamo per averci scelto e restiamo a disposizione per future esigenze.",
};
