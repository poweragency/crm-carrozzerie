import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Tutti i format usano Europe/Rome: su Vercel (runtime UTC) le date
// venivano mostrate -2h rispetto all'ora italiana (es. 9:00 → 7:00).
const ROME_TZ = "Europe/Rome";

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("it-IT", {
    timeZone: ROME_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("it-IT", {
    timeZone: ROME_TZ,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("it-IT", {
    timeZone: ROME_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Ritorna i limiti del "giorno corrente" nel timezone Europe/Rome,
 * come stringhe ISO UTC (per query .gte/.lte su Supabase).
 *
 * Bug fix critico: il server di produzione (Vercel) gira in UTC; un
 * naïve `new Date().setHours(0,0,0,0)` calcola mezzanotte UTC, non
 * mezzanotte italiana. Risultato: dopo le 00:00 italiane (UTC ancora
 * giorno precedente), gli appuntamenti del giorno prima continuano a
 * comparire come "di oggi".
 */
export function todayBoundsInRome(): { start: string; end: string } {
  const TZ = "Europe/Rome";
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // es. "2026-05-17"

  // Costruisco l'istante "Y-M-D 00:00:00 UTC" e guardo che ora vede Rome.
  // L'ora vista da Rome è l'offset (in estate 2, in inverno 1).
  const naiveUtc = new Date(`${ymd}T00:00:00Z`);
  const romeHour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(naiveUtc),
    10
  );
  // Mezzanotte Rome = (naiveUtc) - offset
  const start = new Date(naiveUtc.getTime() - romeHour * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
