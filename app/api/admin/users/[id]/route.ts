import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, adminClient, logAdminAction } from "@/lib/admin";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/users/[id]
 * Elimina un account officina e tutti i suoi dati a cascata.
 * Non si può eliminare se stesso.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  if (id === auth.userId) {
    return NextResponse.json(
      { error: "Non puoi eliminare il tuo stesso account" },
      { status: 400 }
    );
  }

  const admin = adminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminAction(auth.userId, "delete_workshop", id);
  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/admin/users/[id]
 * Disabilita / riabilita un account (banned_until).
 * Body: { action: "disable" | "enable" }
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => null)) as
    | { action?: "disable" | "enable" }
    | null;
  if (!body?.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  if (id === auth.userId && body.action === "disable") {
    return NextResponse.json(
      { error: "Non puoi disabilitare il tuo stesso account" },
      { status: 400 }
    );
  }

  const admin = adminClient();
  const banDuration = body.action === "disable" ? "876000h" : "none"; // ~100 anni vs nessun ban
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: banDuration,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminAction(
    auth.userId,
    body.action === "disable" ? "disable_workshop" : "enable_workshop",
    id
  );
  return NextResponse.json({ ok: true });
}
