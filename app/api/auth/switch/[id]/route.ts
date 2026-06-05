import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSavedAccount,
  removeSavedAccount,
  upsertSavedAccount,
} from "@/lib/auth/saved-accounts";

// Effettua il "passaggio" a un account salvato senza chiedere password:
// usa il refresh token dal cookie HttpOnly per ottenere una nuova sessione
// (il client Supabase SSR aggiorna i cookie di auth in automatico).
// Se il refresh token e' scaduto/revocato → 401 + l'account viene rimosso
// dai salvati (la sessione non c'e' piu', va rifatta col login).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const saved = await getSavedAccount(id);
  if (!saved) {
    return NextResponse.json({ error: "account_not_saved" }, { status: 404 });
  }

  const supabase = await createClient();

  // Logout dell'eventuale sessione corrente prima dello switch, cosi' i cookie
  // di auth vengono ripuliti prima di settare quelli nuovi.
  await supabase.auth.signOut({ scope: "local" });

  // setSession con il refresh token salvato + access token vuoto. Subito dopo
  // refreshSession scambia il refresh per una nuova coppia access/refresh che
  // SSR scrive nei cookie di auth.
  const { error: setErr } = await supabase.auth.setSession({
    access_token: "",
    refresh_token: saved.refresh_token,
  });
  if (setErr) {
    return NextResponse.json({ error: "session_set_failed" }, { status: 500 });
  }

  const { data, error: refreshErr } = await supabase.auth.refreshSession({
    refresh_token: saved.refresh_token,
  });
  if (refreshErr || !data.session) {
    // Refresh token non piu' valido → rimuovi l'account dai salvati.
    await removeSavedAccount(id);
    return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
  }

  // Aggiorna il refresh token nel cookie (refresh rotation).
  await upsertSavedAccount({
    ...saved,
    refresh_token: data.session.refresh_token,
  });

  return NextResponse.json({ ok: true, redirect: "/dashboard" });
}
