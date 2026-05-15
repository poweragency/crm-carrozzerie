import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, adminClient } from "@/lib/admin";

/**
 * POST /api/admin/users
 * Crea una nuova officina (auth user + profile via trigger handle_new_user).
 * Body: { email, password, workshop_name }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string; workshop_name?: string }
    | null;
  if (!body?.email || !body?.password || !body?.workshop_name) {
    return NextResponse.json(
      { error: "Missing email/password/workshop_name" },
      { status: 400 }
    );
  }
  if (body.password.length < 6) {
    return NextResponse.json(
      { error: "Password troppo corta (min. 6 caratteri)" },
      { status: 400 }
    );
  }

  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      workshop_name: body.workshop_name,
      full_name: body.workshop_name,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Il trigger handle_new_user crea già il profile con workshop_name dal metadata.
  return NextResponse.json({ id: data.user?.id, email: data.user?.email });
}
