import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitDistributed, getClientIp } from "@/lib/rate-limit";

/**
 * Facebook Lead Ads webhook (multi-tenant, workshop-based).
 *
 * GET  → verifica del webhook (hub.challenge).
 *        Il `hub.verify_token` viene matchato contro `workshops.fb_verify_token`:
 *        se trova match → 200 con challenge, altrimenti 403.
 *
 * POST → riceve notifica leadgen → trova il workshop via `page_id`
 *        → usa il page_access_token del workshop per leggere il lead dalla Graph API
 *        → inserisce il lead con workshop_id = workshop.id.
 *
 * Il lookup è su `workshops`, non più su `profiles` legacy: i campi FB
 * sono source-of-truth sul workshop (SettingsForm dual-writes), e qui
 * usare workshop direttamente garantisce che il `workshop_id` venga
 * popolato correttamente (il trigger `set_owner_id` non puo' popolarlo
 * automaticamente perche' siamo in service-role, quindi auth.uid()
 * è NULL e current_workshop_id() torna NULL).
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

  const supabase = createAdminClient();
  const { data: workshop } = await supabase
    .from("workshops")
    .select("id")
    .eq("fb_verify_token", token)
    .maybeSingle();

  if (!workshop) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimitDistributed(`fb-webhook:${ip}`, {
    windowMs: 60_000,
    max: 60,
  });
  if (!rl.ok) {
    return new NextResponse("Rate limit", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }
  const rawBody = await req.text();

  // Verifica firma (X-Hub-Signature-256) — globale, App Secret unico.
  // Fail-closed: senza FB_APP_SECRET configurato NON processiamo il payload,
  // altrimenti chiunque potrebbe iniettare leadgen falsi conoscendo un page_id.
  const appSecret = process.env.FB_APP_SECRET;
  if (!appSecret) {
    console.error("[fb-webhook] FB_APP_SECRET non impostata: webhook rifiutato");
    return new NextResponse("Server misconfigured", { status: 500 });
  }
  {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const expected =
      "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
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

  // =========================================================================
  // FORWARD: lead di Power Agency vengono inoltrati al CRM Power Hub.
  // Power Agency usa la stessa app FB ma è un sistema separato (poweragency.it).
  // Le entry forwardate non vengono processate qui (non sono workshop).
  // AWAIT obbligatorio: su Vercel serverless fire-and-forget viene killato.
  // =========================================================================
  const POWER_AGENCY_PAGE_ID = process.env.POWER_AGENCY_PAGE_ID;
  const POWER_HUB_URL = process.env.POWER_HUB_WEBHOOK_URL;
  const POWER_HUB_SECRET = process.env.POWER_HUB_FORWARD_SECRET;
  const isPowerAgencyEntry = (e: { id?: string }) =>
    !!POWER_AGENCY_PAGE_ID && String(e?.id) === POWER_AGENCY_PAGE_ID;

  if (POWER_AGENCY_PAGE_ID && POWER_HUB_URL && POWER_HUB_SECRET) {
    const paEntries = (body.entry ?? []).filter(isPowerAgencyEntry);
    if (paEntries.length > 0) {
      try {
        const r = await fetch(POWER_HUB_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forward-secret": POWER_HUB_SECRET,
          },
          body: JSON.stringify({ ...body, entry: paEntries }),
        });
        if (!r.ok) {
          console.error("[fb-webhook] forward power-hub HTTP", r.status, await r.text());
        }
      } catch (err) {
        console.error("[fb-webhook] forward power-hub failed:", err);
      }
    }
  }

  const supabase = createAdminClient();

  for (const entry of body.entry ?? []) {
    const pageId = entry.id;
    // Skippa le entry di Power Agency: già forwardate sopra, qui non sono workshop
    if (isPowerAgencyEntry(entry)) continue;

    // Trova il workshop che ha registrato questa Pagina FB
    const { data: workshop } = await supabase
      .from("workshops")
      .select("id, fb_page_access_token")
      .eq("fb_page_id", pageId)
      .maybeSingle();

    if (!workshop) {
      console.warn(`[fb-webhook] No workshop linked to page_id ${pageId}`);
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
      let campaignId: string | null = null;
      let campaignName: string | null = null;
      let adsetId: string | null = null;
      let adsetName: string | null = null;
      let adId: string | null = null;
      let adName: string | null = null;
      let formName: string | null = null;

      if (workshop.fb_page_access_token) {
        try {
          // Una sola chiamata: oltre a field_data chiediamo la gerarchia
          // campaign/adset/ad/form per l'attribuzione del lead (mostrata
          // come pill colorata sulla card).
          const fields = [
            "field_data",
            "created_time",
            "campaign_id",
            "campaign_name",
            "adset_id",
            "adset_name",
            "ad_id",
            "ad_name",
            "form_id",
          ].join(",");
          const url = `https://graph.facebook.com/v18.0/${leadgen_id}?fields=${fields}&access_token=${workshop.fb_page_access_token}`;
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
            campaignId = json.campaign_id ?? null;
            campaignName = json.campaign_name ?? null;
            adsetId = json.adset_id ?? null;
            adsetName = json.adset_name ?? null;
            adId = json.ad_id ?? null;
            adName = json.ad_name ?? null;
          } else {
            console.error("[fb-webhook] Graph API error:", res.status, await res.text());
          }
        } catch (err) {
          console.error("[fb-webhook] Fetch lead failed:", err);
        }
      }

      // form_name richiede una chiamata separata su /{form_id}: il
      // nome del form e' usato spesso come fallback quando non c'e'
      // una campagna nominata (es. lead da pagina organica).
      if (form_id && workshop.fb_page_access_token) {
        try {
          const formUrl = `https://graph.facebook.com/v18.0/${form_id}?fields=name&access_token=${workshop.fb_page_access_token}`;
          const formRes = await fetch(formUrl);
          if (formRes.ok) {
            const formJson: { name?: string } = await formRes.json();
            formName = formJson.name ?? null;
          }
        } catch (err) {
          console.error("[fb-webhook] Fetch form name failed:", err);
        }
      }

      // Lead Ads Testing Tool: i campi arrivano valorizzati come
      // "<test lead: full_name>", "<test lead: phone_number>", ecc.
      // Li teniamo (confermano che la pipeline gira end-to-end) ma puliti:
      // marchiamo il nome come lead di test e azzeriamo i valori fasulli
      // sugli altri campi, così la card non mostra placeholder Meta.
      const isTestValue = (v: string | null) =>
        typeof v === "string" && /^<test lead/i.test(v.trim());
      const leadIsTest =
        isTestValue(fullName) ||
        isTestValue(phone) ||
        isTestValue(email) ||
        isTestValue(message);
      if (leadIsTest) {
        fullName = "Lead di test (FB)";
        if (isTestValue(phone)) phone = null;
        if (isTestValue(email)) email = null;
        if (isTestValue(message)) message = null;
      }

      const { error } = await supabase.from("leads").insert({
        workshop_id: workshop.id,
        full_name: fullName,
        phone,
        email,
        message,
        source: "facebook",
        status: "nuovo",
        fb_lead_id: leadgen_id,
        fb_form_id: form_id,
        campaign_id: campaignId,
        campaign_name: campaignName,
        adset_id: adsetId,
        adset_name: adsetName,
        ad_id: adId,
        ad_name: adName,
        form_name: formName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        raw_payload: rawPayload as any,
      });
      if (error) console.error("[fb-webhook] Insert error:", error);
    }
  }

  return NextResponse.json({ received: true });
}

// ============================================================
// Types
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
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  form_id?: string;
}
