import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Facebook Lead Ads webhook (multi-tenant).
 *
 * GET  → verifica del webhook (hub.challenge).
 *        Il `hub.verify_token` viene matchato contro tutti i `profiles.fb_verify_token`:
 *        se trova match → 200 con challenge, altrimenti 403.
 *
 * POST → riceve notifica leadgen → trova il profile via `page_id`
 *        → usa il page_access_token salvato in profile per leggere il lead dalla Graph API
 *        → inserisce il lead con owner_id = profile.id
 *
 * Env vars:
 * - FB_APP_SECRET            (App Secret Meta - per verifica firma X-Hub-Signature-256)
 * - SUPABASE_SERVICE_ROLE_KEY (per scrivere bypassando RLS)
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Cerca un profile con questo verify_token
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("fb_verify_token", token)
    .maybeSingle();

  if (!profile) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`fb-webhook:${ip}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) {
    return new NextResponse("Rate limit", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }
  const rawBody = await req.text();

  // Verifica firma (X-Hub-Signature-256) — globale, App Secret unico
  const appSecret = process.env.FB_APP_SECRET;
  if (appSecret) {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (
      !signature ||
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      console.warn("[fb-webhook] Signature mismatch");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  let body: FbWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  if (body.object !== "page") {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  for (const entry of body.entry ?? []) {
    const pageId = entry.id;

    // Trova il profile che ha registrato questa Pagina FB
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, fb_page_access_token")
      .eq("fb_page_id", pageId)
      .maybeSingle();

    if (!profile) {
      console.warn(`[fb-webhook] No profile linked to page_id ${pageId}`);
      continue;
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const { leadgen_id, form_id } = change.value;

      // Idempotency
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("fb_lead_id", leadgen_id)
        .maybeSingle();
      if (existing) continue;

      let fullName = "Lead Facebook";
      let phone: string | null = null;
      let email: string | null = null;
      let message: string | null = null;
      let rawPayload: unknown = change.value;

      if (profile.fb_page_access_token) {
        try {
          const url = `https://graph.facebook.com/v18.0/${leadgen_id}?access_token=${profile.fb_page_access_token}`;
          const res = await fetch(url);
          if (res.ok) {
            const json: FbLeadResponse = await res.json();
            rawPayload = json;
            for (const f of json.field_data ?? []) {
              const v = f.values?.[0];
              if (!v) continue;
              const name = f.name.toLowerCase();
              if (name.includes("name") || name === "full_name") fullName = v;
              else if (name.includes("phone")) phone = v;
              else if (name.includes("email")) email = v;
              else if (name.includes("message") || name.includes("note")) message = v;
            }
          } else {
            console.error(
              "[fb-webhook] Graph API error:",
              res.status,
              await res.text()
            );
          }
        } catch (err) {
          console.error("[fb-webhook] Fetch lead failed:", err);
        }
      }

      const { error } = await supabase.from("leads").insert({
        owner_id: profile.id,
        full_name: fullName,
        phone,
        email,
        message,
        source: "facebook",
        status: "nuovo",
        fb_lead_id: leadgen_id,
        fb_form_id: form_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        raw_payload: rawPayload as any,
      });
      if (error) console.error("[fb-webhook] Insert error:", error);
    }
  }

  return NextResponse.json({ received: true });
}

// ============================================================
interface FbWebhookBody {
  object: string;
  entry?: Array<{
    id: string; // page_id
    time: number;
    changes?: Array<{
      field: string;
      value: {
        leadgen_id: string;
        form_id: string;
        page_id?: string;
        adgroup_id?: string;
        created_time?: number;
      };
    }>;
  }>;
}

interface FbLeadResponse {
  id: string;
  created_time?: string;
  field_data?: Array<{ name: string; values: string[] }>;
}
