import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitDistributed } from "@/lib/rate-limit";

const bodySchema = z.object({
  case_id: z.string().uuid(),
  kind: z.enum(["preventivo", "fattura"]).default("preventivo"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const rl = await rateLimitDistributed(`invoices:${user.id}`, {
    windowMs: 60_000,
    max: 30,
  });
  if (!rl.ok) {
    return new NextResponse("Rate limit", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Body non valido" },
      { status: 400 }
    );
  }
  const { case_id, kind } = parsed.data;

  // La RPC verifica owner e numera in modo atomico (advisory lock)
  const { data, error } = await supabase.rpc("create_invoice_draft", {
    p_case_id: case_id,
    p_kind: kind,
  });

  if (error) {
    if (error.message?.includes("forbidden")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (error.message?.includes("case_not_found")) {
      return new NextResponse("Case not found", { status: 404 });
    }
    console.error("[invoices] create_invoice_draft error:", error);
    return new NextResponse("Errore interno", { status: 500 });
  }

  return NextResponse.json({ id: data });
}
