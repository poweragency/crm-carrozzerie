import type { LeadStatus, CaseStatus } from "@/types/database.types";

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "nuovo",
  "contattato",
  "preventivo",
  "cliente",
  "perso",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuovo: "Nuovo",
  contattato: "Contattato",
  preventivo: "Preventivo",
  cliente: "Cliente",
  perso: "Perso",
};

export const LEAD_STATUS_COLORS: Record<
  LeadStatus,
  { dot: string; bg: string; text: string }
> = {
  nuovo: { dot: "bg-status-info", bg: "bg-status-info/10", text: "text-status-info" },
  contattato: {
    dot: "bg-status-warning",
    bg: "bg-status-warning/10",
    text: "text-status-warning",
  },
  preventivo: { dot: "bg-chart-5", bg: "bg-chart-5/10", text: "text-chart-5" },
  cliente: { dot: "bg-accent", bg: "bg-accent/10", text: "text-accent" },
  perso: {
    dot: "bg-text-subtle",
    bg: "bg-text-subtle/10",
    text: "text-text-muted",
  },
};

export const CASE_STATUS_ORDER: CaseStatus[] = [
  "preparazione",
  "verniciatura",
  "finitura",
  "completata",
  "consegnata",
  "liquidato",
];

// Step della parte "produzione": visibili anche allo staff. Tutto il
// resto (post-produzione) è riservato all'owner — vedi CaseDetail.
export const CASE_PRODUCTION_STATUSES: CaseStatus[] = [
  "preparazione",
  "verniciatura",
  "finitura",
];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  preparazione: "Preparazione",
  verniciatura: "Verniciatura",
  finitura: "Finitura",
  completata: "Completata",
  consegnata: "Consegnata",
  liquidato: "Liquidato",
};

export const CASE_STATUS_COLORS: Record<CaseStatus, { bg: string; text: string }> = {
  preparazione: { bg: "bg-chart-5/10", text: "text-chart-5" },
  verniciatura: { bg: "bg-status-warning/10", text: "text-status-warning" },
  finitura: { bg: "bg-status-info/10", text: "text-status-info" },
  completata: { bg: "bg-status-success/10", text: "text-status-success" },
  consegnata: { bg: "bg-accent/10", text: "text-accent" },
  liquidato: { bg: "bg-cyan-500/10", text: "text-cyan-400" },
};
