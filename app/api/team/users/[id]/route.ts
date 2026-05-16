import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

interface Ctx {
  params: Promise<{ id: string }>;
}

const patchBodySchema = z.object({
  password: z.string().min(6, "Password troppo corta (min. 6 caratteri)"),
});

async function ensureStaffOfWorkshop(
  id: string,
  workshopId: string
): Promise<{ ok: true } | NextResponse> {
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("workshop_id, role")
    .eq("id", id)
    .single();
  if (!target) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }
  if (target.workshop_id !== workshopId) {
    return NextResponse.json(
      { error: "Utente non appartiene al tuo workshop" },
      { status: 403 }
    );
  }
  if (target.role !== "staff") {
    return NextResponse.json(
      { error: "L'azione è permessa solo sugli account staff" },
      { status: 400 }
    );
  }
  return { ok: true };
}

/**
 * PATCH /api/team/users/[id]
 * Resetta la password di un dipendente. Body: { password }
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireOwner();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  if (id === auth.userId) {
    return NextResponse.json(
      { error: "Per cambiare la tua password vai in Impostazioni Supabase" },
      { status: 400 }
    );
  }

  const check = await ensureStaffOfWorkshop(id, auth.workshopId);
  if (check instanceof NextResponse) return check;

  const json = await req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Body non valido" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    password: parsed.data.password,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/team/users/[id]
 * Rimuove un dipendente dal workshop dell'owner caller.
 * Verifica che il target sia uno staff del MEDESIMO workshop.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireOwner();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  if (id === auth.userId) {
    return NextResponse.json(
      { error: "Non puoi eliminare il tuo stesso account" },
      { status: 400 }
    );
  }

  const check = await ensureStaffOfWorkshop(id, auth.workshopId);
  if (check instanceof NextResponse) return check;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
