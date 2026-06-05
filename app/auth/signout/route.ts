import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  // scope: 'local' → pulisce solo i cookie di questa sessione/dispositivo.
  // signOut() di default e' 'global' e revoca TUTTI i refresh token attivi
  // dell'utente, inclusi quelli che potremmo aver salvato in saved-accounts.
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/login", request.url), { status: 302 });
}
