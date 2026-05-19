import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseDetail } from "@/components/CaseDetail";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: caseData } = await supabase
    .from("cases")
    .select("*, customers(id, full_name, phone, email)")
    .eq("id", id)
    .single();

  if (!caseData) notFound();

  const [
    { data: documents },
    { data: customers },
    { data: vehicles },
    { data: invoices },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id, full_name, phone, email")
      .order("full_name", { ascending: true }),
    supabase.from("vehicles").select("*").order("created_at", { ascending: true }),
    supabase
      .from("invoices")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
    user
      ? supabase
          .from("profiles")
          .select("role, workshop:workshops(name)")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const role = profile?.role ?? "owner";
  const isAdmin = user?.app_metadata?.is_admin === true;
  const workshopName =
    (
      profile as unknown as {
        workshop?: { name: string } | null;
      } | null
    )?.workshop?.name ?? null;

  return (
    <CaseDetail
      initialCase={caseData}
      initialDocuments={documents ?? []}
      initialCustomers={customers ?? []}
      initialVehicles={vehicles ?? []}
      initialInvoices={invoices ?? []}
      role={role}
      isAdmin={isAdmin}
      workshopName={workshopName}
    />
  );
}
