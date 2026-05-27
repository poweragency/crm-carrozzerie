import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CasesTable, type CaseWithRelations } from "@/components/CasesTable";
import type { UserRole } from "@/types/database.types";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role: UserRole = profile?.role ?? "owner";

  // L'RLS filtra già le pratiche alla fase di competenza del dipendente.
  const { data: cases } = await supabase
    .from("cases")
    .select("*, customers(id, full_name, phone, email), vehicles(make, model, plate)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return <CasesTable initialCases={(cases ?? []) as CaseWithRelations[]} role={role} />;
}
