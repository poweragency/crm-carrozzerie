import { createClient } from "@/lib/supabase/server";
import { CasesTable, type CaseWithRelations } from "@/components/CasesTable";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("cases")
    .select("*, customers(id, full_name, phone, email), vehicles(make, model, plate)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return <CasesTable initialCases={(cases ?? []) as CaseWithRelations[]} />;
}
