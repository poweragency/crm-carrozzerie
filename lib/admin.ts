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

/**
 * Logga un'azione admin nel registro `admin_audit_log`.
 * Errori di logging vengono ingoiati (best-effort) per non bloccare le azioni.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      admin_id: adminId,
      action,
      target_user_id: targetUserId ?? null,
      details: (details ?? null) as never,
    });
  } catch (err) {
    console.error("[admin-audit] log failed:", err);
  }
}
