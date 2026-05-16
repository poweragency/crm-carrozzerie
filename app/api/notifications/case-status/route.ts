import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CASE_STATUS_LABELS } from "@/lib/constants";
import type { CaseStatus } from "@/types/database.types";
import { rateLimit } from "@/lib/rate-limit";

const STATUS_MESSAGES: Record<CaseStatus, string> = {
  preventivo:
    "Stiamo preparando il preventivo per la riparazione del Suo veicolo. La contatteremo a breve con i dettagli.",
  attesa_pezzi:
    "Abbiamo ordinato i pezzi necessari per la riparazione. La avviseremo non appena saranno disponibili.",
  lavorazione:
    "Il Suo veicolo è entrato in lavorazione. Le scriveremo non appena la riparazione sarà completata.",
  completata:
    "La riparazione del Suo veicolo è completata. Può venire a ritirarlo negli orari di apertura dell'officina.",
  consegnata:
    "Confermiamo la consegna del Suo veicolo. La ringraziamo per averci scelto e restiamo a disposizione per future esigenze.",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // 10 email/min per utente per evitare spam o abuse della tab Notifica
  const rl = rateLimit(`notify-status:${user.id}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) {
    return NextResponse.json(
      { sent: false, error: "Troppe richieste, riprova tra qualche istante" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as { case_id?: string } | null;
  if (!body?.case_id) return new NextResponse("Missing case_id", { status: 400 });

  const { data: caseRow } = await supabase
    .from("cases")
    .select(
      "id, status, customers(full_name, email), vehicles(make, model, plate)"
    )
    .eq("id", body.case_id)
    .single();

  if (!caseRow) return new NextResponse("Case not found", { status: 404 });

  const customers = caseRow.customers as
    | { full_name: string; email: string | null }
    | { full_name: string; email: string | null }[]
    | null;
  const customer = Array.isArray(customers) ? customers[0] : customers;
  if (!customer?.email) {
    return NextResponse.json(
      { error: "Il cliente non ha un indirizzo email" },
      { status: 422 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workshop_name, phone")
    .eq("id", user.id)
    .single();

  const vehicles = caseRow.vehicles as
    | { make: string | null; model: string | null; plate: string | null }
    | { make: string | null; model: string | null; plate: string | null }[]
    | null;
  const vehicle = Array.isArray(vehicles) ? vehicles[0] : vehicles;
  const vehicleDescr = vehicle
    ? [vehicle.make, vehicle.model, vehicle.plate].filter(Boolean).join(" · ")
    : null;

  const status = caseRow.status as CaseStatus;
  const workshopName = profile?.workshop_name ?? "L'officina";
  const subject = `${workshopName} — aggiornamento pratica: ${CASE_STATUS_LABELS[status]}`;
  const text = [
    `Buongiorno ${customer.full_name},`,
    "",
    STATUS_MESSAGES[status],
    "",
    vehicleDescr ? `Riferimento veicolo: ${vehicleDescr}` : null,
    "",
    `Cordiali saluti,`,
    workshopName,
    profile?.phone ? `Tel. ${profile.phone}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromAddress) {
    return NextResponse.json(
      {
        sent: false,
        reason: "email_not_configured",
        preview: { to: customer.email, subject, text },
      },
      { status: 200 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: customer.email,
        subject,
        text,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return NextResponse.json(
        { sent: false, error: errorBody },
        { status: 502 }
      );
    }

    return NextResponse.json({ sent: true, to: customer.email });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        sent: false,
        error: aborted
          ? "Resend non ha risposto entro 10 secondi"
          : err instanceof Error
            ? err.message
            : "Errore di rete",
      },
      { status: 504 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
