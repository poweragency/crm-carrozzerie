import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkshopTable } from "@/components/admin/WorkshopTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = user.app_metadata?.is_admin === true;
  if (!isAdmin) redirect("/dashboard");

  const { data: workshops, error } = await supabase.rpc("admin_get_workshops");

  return (
    <WorkshopTable
      initialWorkshops={workshops ?? []}
      currentUserId={user.id}
      error={error?.message ?? null}
    />
  );
}
