import type { Case, CaseStatus, UserRole } from "@/types/database.types";

// ============================================================
// Ruoli dipendente (mansioni) ↔ fasi di produzione carrozzeria.
// Helper client+server (importa solo tipi). Lo specchio lato DB sono le
// funzioni public.role_phase() / public.next_phase() (migration M2/M3).
// ============================================================

export const EMPLOYEE_ROLES = ["preparatore", "verniciatore", "finitore"] as const;
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Titolare",
  preparatore: "Preparatore",
  verniciatore: "Verniciatore",
  finitore: "Finitore",
};

export const ROLE_DESCRIPTIONS: Record<EmployeeRole, string> = {
  preparatore:
    "Vede solo le pratiche in preparazione. Carica la foto e le passa al verniciatore.",
  verniciatore:
    "Vede le pratiche dopo la preparazione. Carica la foto e le passa al finitore.",
  finitore:
    "Vede le pratiche dopo la verniciatura. Carica la foto e conclude per il titolare.",
};

// mansione → fase di produzione di competenza
const ROLE_PHASE: Record<EmployeeRole, CaseStatus> = {
  preparatore: "preparazione",
  verniciatore: "verniciatura",
  finitore: "finitura",
};

// fase di produzione → fase successiva (oltre la finitura → completata)
const NEXT_PHASE: Partial<Record<CaseStatus, CaseStatus>> = {
  preparazione: "verniciatura",
  verniciatura: "finitura",
  finitura: "completata",
};

// fase di produzione → colonne "check" su cases
export const PHASE_DONE_FIELDS = {
  preparazione: { at: "preparazione_done_at", by: "preparazione_done_by" },
  verniciatura: { at: "verniciatura_done_at", by: "verniciatura_done_by" },
  finitura: { at: "finitura_done_at", by: "finitura_done_by" },
} as const satisfies Record<
  "preparazione" | "verniciatura" | "finitura",
  { at: keyof Case; by: keyof Case }
>;

export function isEmployeeRole(role: UserRole | null | undefined): role is EmployeeRole {
  return role === "preparatore" || role === "verniciatore" || role === "finitore";
}

/** Fase di produzione di competenza della mansione (null per owner). */
export function rolePhase(role: UserRole | null | undefined): CaseStatus | null {
  return isEmployeeRole(role) ? ROLE_PHASE[role] : null;
}

/** Fase successiva nel flusso di produzione (null se non avanzabile). */
export function nextPhase(status: CaseStatus): CaseStatus | null {
  return NEXT_PHASE[status] ?? null;
}
