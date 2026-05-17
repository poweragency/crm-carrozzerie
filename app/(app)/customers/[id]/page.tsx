import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerDetail } from "@/components/CustomerDetail";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customer }, { data: vehicles }, { data: cases }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase
      .from("vehicles")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("cases")
      .select(
        "id, status, price, insurance_company, description, created_at, updated_at, archived_at, vehicles(make, model, plate)"
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!customer) notFound();

  return (
    <CustomerDetail
      initialCustomer={customer}
      initialVehicles={vehicles ?? []}
      initialCases={cases ?? []}
    />
  );
}
