import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CASE_STATUS_LABELS } from "@/lib/constants";
import { CASE_NOTIFY_MESSAGES } from "@/lib/notify-messages";
import type { CaseStatus } from "@/types/database.types";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ case_id: z.string().uuid() });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // Solo owner (o admin) puo' inviare notifiche al cliente: lo staff
  // non ha visibilita' sui canali comunicazione cliente.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = user.app_metadata?.is_admin === true;
  if (!isAdmin && profile?.role !== "owner") {
    return NextResponse.json(
      { sent: false, error: "Operazione riservata al titolare dell'officina." },
      { status: 403 }
    );
  }

  // 10 email/min per utente per evitare spam o abuse della tab Notifica
  const rl = rateLimit(`notify-status:${user.id}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) {
    return NextResponse.json(
      { sent: false, error: "Troppe richieste, riprova tra qualche istante" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Body non valido" },
      { status: 400 }
    );
  }

  const { data: caseRow } = await supabase
    .from("cases")
    .select(
      "id, status, workshop_id, customers(full_name, email), vehicles(make, model, plate)"
    )
    .eq("id", parsed.data.case_id)
    .single();

  if (!caseRow) return new NextResponse("Case not found", { status: 404 });

  // L'invio è permesso solo a pratica completata. Il frontend disabilita
  // il pulsante, qui è solo un safety net contro chiamate dirette all'API.
  if (caseRow.status !== "completata") {
    return NextResponse.json(
      {
        sent: false,
        error: "La notifica è disponibile solo quando la pratica è 'completata'.",
      },
      { status: 422 }
    );
  }

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

  // Dati officina dalla tabella workshops (source-of-truth). Per il
  // reply-to usiamo l'email dell'owner del workshop, recuperata da
  // auth.users via admin client.
  const { data: workshop } = await supabase
    .from("workshops")
    .select("name, phone")
    .eq("id", caseRow.workshop_id)
    .single();

  const adminClient = createAdminClient();
  const { data: ownerRow } = await adminClient
    .from("profiles")
    .select("id")
    .eq("workshop_id", caseRow.workshop_id)
    .eq("role", "owner")
    .maybeSingle();

  let workshopEmail: string | null = null;
  if (ownerRow?.id) {
    const { data: ownerAuth } = await adminClient.auth.admin.getUserById(ownerRow.id);
    workshopEmail = ownerAuth?.user?.email ?? null;
  }

  const vehicles = caseRow.vehicles as
    | { make: string | null; model: string | null; plate: string | null }
    | { make: string | null; model: string | null; plate: string | null }[]
    | null;
  const vehicle = Array.isArray(vehicles) ? vehicles[0] : vehicles;
  const vehicleDescr = vehicle
    ? [vehicle.make, vehicle.model, vehicle.plate].filter(Boolean).join(" · ")
    : null;

  const status = caseRow.status as CaseStatus;
  const workshopName = workshop?.name ?? "L'officina";
  const subject = `${workshopName} — aggiornamento pratica: ${CASE_STATUS_LABELS[status]}`;
  const text = [
    `Buongiorno ${customer.full_name},`,
    "",
    CASE_NOTIFY_MESSAGES[status],
    "",
    vehicleDescr ? `Riferimento veicolo: ${vehicleDescr}` : null,
    workshopEmail ? `Per rispondere scriva a: ${workshopEmail}` : null,
    "",
    `Cordiali saluti,`,
    workshopName,
    workshop?.phone ? `Tel. ${workshop.phone}` : null,
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

  // From: nome officina + indirizzo verificato in Resend (la deliverability
  // richiede SPF/DKIM sul dominio di RESEND_FROM_EMAIL, non si può usare
  // l'email del cliente come from o l'invio finisce in spam/rifiutato).
  // Reply-To: email dell'officina, cosi' le risposte tornano al titolare.
  const escapedName = workshopName.replace(/"/g, '\\"');
  const from = `"${escapedName}" <${fromAddress}>`;

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
        from,
        to: customer.email,
        ...(workshopEmail ? { reply_to: workshopEmail } : {}),
        subject,
        text,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return NextResponse.json({ sent: false, error: errorBody }, { status: 502 });
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
