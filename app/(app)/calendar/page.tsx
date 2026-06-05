import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();

  const [
    { data: appointments },
    { data: customersRaw },
    { data: cases },
    { data: deadlineRows },
  ] = await Promise.all([
    supabase.from("appointments").select("*").order("starts_at", { ascending: true }),
    // Solo clienti con almeno una pratica (inner join nasconde gli orfani)
    supabase
      .from("customers")
      .select("id, full_name, cases!inner(id)")
      .order("full_name"),
    supabase.from("cases").select("id, customer_id"),
    // Scadenze pratiche (mostrate sul calendario): tutte tranne quelle liquidate.
    supabase
      .from("cases")
      .select("id, due_at, status, customers(full_name), vehicles(plate)")
      .neq("status", "liquidato"),
  ]);

  const customers = customersRaw?.map(({ id, full_name }) => ({ id, full_name })) ?? [];

  type DeadlineRow = {
    id: string;
    due_at: string;
    customers: { full_name: string } | null;
    vehicles: { plate: string | null } | null;
  };
  const caseDeadlines = ((deadlineRows ?? []) as DeadlineRow[]).map((r) => ({
    id: r.id,
    due_at: r.due_at,
    customerName: r.customers?.full_name ?? "Pratica",
    plate: r.vehicles?.plate ?? null,
  }));

  return (
    <CalendarView
      initialAppointments={appointments ?? []}
      customers={customers}
      cases={cases ?? []}
      caseDeadlines={caseDeadlines}
    />
  );
}
