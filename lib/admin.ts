import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Verifica che il caller sia admin. Ritorna null se ok,
 * altrimenti una NextResponse con 401/403.
 */
export async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const isAdmin = user.app_metadata?.is_admin === true;
  if (!isAdmin) return new NextResponse("Forbidden", { status: 403 });

  return { userId: user.id };
}

export function adminClient() {
  return createAdminClient();
}
