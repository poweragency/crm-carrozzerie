import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamView, type TeamMember } from "@/components/TeamView";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caller } = await supabase
    .from("profiles")
    .select("workshop_id, role")
    .eq("id", user.id)
    .single();

  if (!caller || caller.role !== "owner") {
    redirect("/dashboard");
  }

  // Carica tutti i membri del workshop (owner + staff).
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("workshop_id", caller.workshop_id);

  // Le email vivono in auth.users → uso admin client (RLS server-side).
  const admin = createAdminClient();
  const memberList: TeamMember[] = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: authUser } = await admin.auth.admin.getUserById(m.id);
      return {
        id: m.id,
        full_name: m.full_name ?? "",
        email: authUser.user?.email ?? "—",
        role: m.role,
        created_at: m.created_at,
        last_sign_in_at: authUser.user?.last_sign_in_at ?? null,
        is_me: m.id === user.id,
      };
    })
  );

  // Ordina: owner prima, poi staff per data creazione
  memberList.sort((a, b) => {
    if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });

  // Audit log degli ultimi 100 eventi del workshop
  const { data: auditRows } = await supabase
    .from("workshop_audit_log")
    .select(
      "id, action, actor_full_name, actor_role, entity_type, entity_label, changes, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return <TeamView members={memberList} activity={(auditRows ?? []) as never} />;
}
