import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const rl = rateLimit(`invoices:${user.id}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    return new NextResponse("Rate limit", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }
  // ip fallback per utenti anonimi (non dovrebbe accadere qui)
  void getClientIp(req);

  const body = (await req.json().catch(() => null)) as
    | { case_id?: string; kind?: "preventivo" | "fattura" }
    | null;
  if (!body?.case_id) return new NextResponse("Missing case_id", { status: 400 });

  const kind = body.kind === "fattura" ? "fattura" : "preventivo";

  // La RPC verifica owner e numera in modo atomico (advisory lock)
  const { data, error } = await supabase.rpc("create_invoice_draft", {
    p_case_id: body.case_id,
    p_kind: kind,
  });

  if (error) {
    if (error.message?.includes("forbidden")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (error.message?.includes("case_not_found")) {
      return new NextResponse("Case not found", { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data });
}
