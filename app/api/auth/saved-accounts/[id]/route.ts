import { NextResponse } from "next/server";
import { removeSavedAccount } from "@/lib/auth/saved-accounts";

// Rimuove un account dalla lista dei salvati su questo dispositivo (non
// disattiva la sessione lato Supabase: e' una pulizia locale).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await removeSavedAccount(id);
  return NextResponse.json({ ok: true });
}
