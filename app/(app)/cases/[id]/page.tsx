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
  ]);

  return (
    <CaseDetail
      initialCase={caseData}
      initialDocuments={documents ?? []}
      initialCustomers={customers ?? []}
      initialVehicles={vehicles ?? []}
      initialInvoices={invoices ?? []}
    />
  );
}
