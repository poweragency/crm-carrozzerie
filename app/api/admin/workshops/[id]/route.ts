import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, adminClient, logAdminAction } from "@/lib/admin";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/workshops/[id]
 * Elimina interamente un workshop:
 * 1. Elimina ogni auth.user collegato (CASCADE su profiles)
 * 2. Elimina il workshop (CASCADE su tutte le tabelle business workshop_id)
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const admin = adminClient();

  // Lista profili del workshop
  const { data: members, error: listErr } = await admin
    .from("profiles")
    .select("id")
    .eq("workshop_id", id);
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  // Sicurezza: l'admin non può eliminare il workshop a cui appartiene
  // (eviteremmo di restare senza accesso ai propri dati).
  if (members?.some((m) => m.id === auth.userId)) {
    return NextResponse.json(
      { error: "Non puoi eliminare il workshop a cui appartieni" },
      { status: 400 }
    );
  }

  // Elimina ogni user → cascade su profiles
  for (const m of members ?? []) {
    const { error } = await admin.auth.admin.deleteUser(m.id);
    if (error) {
      return NextResponse.json(
        { error: `Errore eliminando membro ${m.id}: ${error.message}` },
        { status: 500 }
      );
    }
  }

  // Adesso il workshop non ha più profili (RESTRICT FK rispettato), elimino
  const { error: wsErr } = await admin.from("workshops").delete().eq("id", id);
  if (wsErr) {
    return NextResponse.json({ error: wsErr.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, "delete_workshop", null, {
    workshop_id: id,
    members_deleted: members?.length ?? 0,
  });

  return NextResponse.json({ ok: true });
}
