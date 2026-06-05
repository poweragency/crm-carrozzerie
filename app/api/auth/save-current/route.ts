import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertSavedAccount } from "@/lib/auth/saved-accounts";

// Salva l'account corrente come "saved" su questo dispositivo: registra il
// refresh token nel cookie HttpOnly insieme ai dati per il render della
// pagina di login (email, nome, avatar).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.refresh_token || !session.user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Profilo per nome + avatar.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", session.user.id)
    .single();

  await upsertSavedAccount({
    id: session.user.id,
    email: session.user.email ?? "",
    full_name: profile?.full_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    refresh_token: session.refresh_token,
    saved_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
