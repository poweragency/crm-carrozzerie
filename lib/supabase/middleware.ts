import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmployeeRole } from "@/lib/roles";
import type { Database } from "@/types/database.types";

export async function updateSession(request: NextRequest) {
  // Early-out per gli endpoint di auth che gestiscono da soli i cookie di
  // sessione: il middleware NON deve chiamare getUser()/refresh sui cookie
  // del vecchio utente prima che la route abbia scritto quelli del nuovo,
  // altrimenti vincono i Set-Cookie del middleware e lo switch fallisce.
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/termini") ||
    pathname.startsWith("/cookie") ||
    pathname.startsWith("/api/webhooks");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Gating dipendenti: le mansioni (preparatore/verniciatore/finitore) possono
  // accedere alla coda pratiche (/cases), all'anagrafica clienti (/customers,
  // tranne l'import massivo riservato all'owner), al calendario (/calendar) e
  // alle API. Ogni altra pagina app viene reindirizzata a /cases. Interroghiamo
  // il ruolo solo quando serve (path potenzialmente ristretto) per non gravare
  // su ogni richiesta.
  const employeeAllowed =
    pathname.startsWith("/cases") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/api") ||
    (pathname.startsWith("/customers") && !pathname.startsWith("/customers/importa"));
  if (user && !isPublic && !employeeAllowed) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile && isEmployeeRole(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/cases";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
