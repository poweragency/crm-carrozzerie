import { createClient } from "@/lib/supabase/server";
import {
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
  LEAD_STATUS_LABELS,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDateTime,
  formatTime,
  initials,
  todayBoundsInRome,
} from "@/lib/utils";
import {
  KanbanSquare,
  Users,
  FolderKanban,
  CheckCircle2,
  Euro,
  TrendingUp,
  Wallet,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { CaseStatus } from "@/types/database.types";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StatusDonut } from "@/components/dashboard/StatusDonut";

// Revalidate ogni 30s: dashboard non deve essere strettamente real-time
export const revalidate = 30;

const DAYS_WINDOW = 30;

interface DashboardStats {
  leads_total: number;
  customers_total: number;
  open_cases_total: number;
  completed_cases_total: number;
  revenue_total: number | string;
  revenue_collected: number | string;
  leads_spark: number[];
  customers_spark: number[];
  open_cases_spark: number[];
  completed_spark: number[];
  revenue_daily: Array<number | string>;
  status_counts: Partial<Record<CaseStatus, number>>;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: statsJson },
    { data: latestLeads },
    { data: latestCases },
    { data: todayAppointments },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, role, workshop:workshops(name, vat_number, address, iban, fb_page_id)"
      )
      .eq("id", user!.id)
      .single(),
    supabase.rpc("get_dashboard_stats", { p_days: DAYS_WINDOW }),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("cases")
      .select(
        "id, status, price, created_at, customers(full_name), vehicles(make, model, plate)"
      )
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    (() => {
      const { start, end } = todayBoundsInRome();
      return supabase
        .from("appointments")
        .select("id, title, starts_at, kind")
        .gte("starts_at", start)
        .lte("starts_at", end)
        .order("starts_at", { ascending: true })
        .limit(5);
    })(),
  ]);

  const stats = (statsJson ?? {}) as unknown as DashboardStats;

  const revenue = Number(stats.revenue_total ?? 0);
  const collected = Number(stats.revenue_collected ?? 0);
  const leadsSpark = stats.leads_spark ?? [];
  const customersSpark = stats.customers_spark ?? [];
  const openCasesSpark = stats.open_cases_spark ?? [];
  const completedSpark = stats.completed_spark ?? [];
  const revenueDaily = (stats.revenue_daily ?? []).map((v) => Number(v));

  const statusCounts: Record<CaseStatus, number> = {
    preparazione: 0,
    verniciatura: 0,
    finitura: 0,
    completata: 0,
    consegnata: 0,
    liquidato: 0,
  };
  if (stats.status_counts) {
    for (const k of Object.keys(stats.status_counts) as CaseStatus[]) {
      statusCounts[k] = stats.status_counts[k] ?? 0;
    }
  }

  const totalCases = (stats.open_cases_total ?? 0) + (stats.completed_cases_total ?? 0);
  const todayAppointmentsCount = todayAppointments?.length ?? 0;

  const statCards = [
    {
      label: "Lead totali",
      value: stats.leads_total ?? 0,
      icon: KanbanSquare,
      color: "text-status-info",
      stroke: "rgb(var(--status-info))",
      data: leadsSpark,
    },
    {
      label: "Clienti totali",
      value: stats.customers_total ?? 0,
      icon: Users,
      color: "text-status-success",
      stroke: "rgb(var(--status-success))",
      data: customersSpark,
    },
    {
      label: "Pratiche aperte",
      value: stats.open_cases_total ?? 0,
      icon: FolderKanban,
      color: "text-status-warning",
      stroke: "rgb(var(--status-warning))",
      data: openCasesSpark,
    },
    {
      label: "Pratiche completate",
      value: stats.completed_cases_total ?? 0,
      icon: CheckCircle2,
      color: "text-accent",
      stroke: "rgb(var(--accent))",
      data: completedSpark,
    },
  ];

  const isOwner = (profile?.role ?? "owner") === "owner";
  const showRevenue = isOwner;

  // Onboarding checklist (visibile solo a owner/admin)
  const ws = (
    profile as unknown as {
      workshop?: {
        name: string;
        vat_number: string | null;
        address: string | null;
        iban: string | null;
        fb_page_id: string | null;
      } | null;
    }
  )?.workshop;

  // Greeting: per gli staff usa il loro nome ("Ciao, Mario"); per owner
  // usa il nome dell'officina ("Ciao, Carrozzeria Rossi"). Mai più il
  // legacy profile.workshop_name (che per staff era 'La mia carrozzeria').
  const greetingName = isOwner
    ? (ws?.name ?? "la tua officina")
    : profile?.full_name?.trim() || ws?.name || "";
  const profileDone = !!(ws?.vat_number && ws?.address && ws?.iban);
  const fbDone = !!ws?.fb_page_id;
  const onboardingComplete = profileDone && fbDone;
  const showOnboarding = isOwner && !onboardingComplete;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Ciao, {greetingName} 👋</h1>
        <p className="text-sm text-text-muted mt-1">
          {totalCases === 0
            ? "Iniziamo: aggiungi il primo lead o crea una pratica manuale."
            : `Hai ${stats.open_cases_total ?? 0} pratiche aperte${
                todayAppointmentsCount > 0
                  ? ` e ${todayAppointmentsCount} ${todayAppointmentsCount === 1 ? "appuntamento" : "appuntamenti"} oggi`
                  : ""
              }.`}
        </p>
      </div>

      {showOnboarding && <OnboardingGuide profileDone={profileDone} fbDone={fbDone} />}

      {/* KPI cards con sparkline.
       *
       * Owner: 4 card in fila (Lead, Clienti, Aperte, Completate).
       * Staff: 2 card sopra (Clienti, Aperte) + le altre 2 sotto, ai
       * lati del donut, per evitare lo spazio vuoto a destra che
       * c'era col donut da solo. */}
      {showRevenue ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s) => (
            <KpiCard key={s.label} stat={s} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <KpiCard stat={statCards[0]} />
          <KpiCard stat={statCards[2]} />
        </div>
      )}

      {/* Fatturato cards — visibili solo all'owner */}
      {showRevenue && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="card p-5 bg-gradient-to-br from-accent/10 to-transparent border-accent/20 hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-accent/20 flex items-center justify-center shrink-0">
                <Euro className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-text-muted">
                  Fatturato stimato
                </div>
                <div className="text-2xl font-semibold tabular-nums mt-0.5">
                  {formatCurrency(revenue)}
                </div>
                <div className="text-[11px] text-text-subtle">
                  Somma di tutte le pratiche
                </div>
              </div>
              <TrendingUp
                className="w-5 h-5 text-accent ml-auto shrink-0"
                strokeWidth={2}
              />
            </div>
          </div>

          <div className="card p-5 bg-gradient-to-br from-status-success/10 to-transparent border-status-success/20 hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-status-success/20 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-status-success" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-text-muted">
                  Fatturato incassato
                </div>
                <div className="text-2xl font-semibold tabular-nums mt-0.5">
                  {formatCurrency(collected)}
                </div>
                <div className="text-[11px] text-text-subtle">
                  Solo pratiche liquidate
                </div>
              </div>
              <CheckCircle2
                className="w-5 h-5 text-status-success ml-auto shrink-0"
                strokeWidth={2}
              />
            </div>
          </div>
        </div>
      )}

      {/* Riga centrale.
       *
       * Owner: fatturato 30gg (col-span-2) + donut.
       * Staff: Lead totali + donut + Pratiche completate (3 col uguali)
       * — riempie lo spazio che altrimenti restava vuoto a destra. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {showRevenue ? (
          <div className="card p-5 lg:col-span-2 hover:shadow-card-hover transition-all">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Fatturato incassato</h2>
              <span className="text-[11px] text-text-subtle">
                Totale {formatCurrency(revenueDaily[revenueDaily.length - 1] ?? 0)}
              </span>
            </div>
            <RevenueChart data={revenueDaily} />
          </div>
        ) : (
          <KpiCard stat={statCards[1]} />
        )}

        <div className="card p-5 hover:shadow-card-hover transition-all">
          <h2 className="text-sm font-semibold mb-3">Pratiche per stato</h2>
          {totalCases > 0 ? (
            <StatusDonut counts={statusCounts} />
          ) : (
            <div className="text-center text-xs text-text-subtle py-8">
              Nessuna pratica.
            </div>
          )}
        </div>

        {!showRevenue && <KpiCard stat={statCards[3]} />}
      </div>

      {/* Oggi: appuntamenti */}
      {todayAppointmentsCount > 0 && (
        <div className="card overflow-hidden mb-6 hover:shadow-card-hover transition-all">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold">Oggi in officina</h2>
              <span className="text-[11px] text-text-subtle">
                ({todayAppointmentsCount})
              </span>
            </div>
            <Link
              href="/calendar"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1"
            >
              Calendario <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {todayAppointments?.map((a) => (
              <div
                key={a.id}
                className="px-5 py-2.5 hover:bg-bg-hover transition-colors flex items-center gap-3"
              >
                <div className="text-sm font-medium tabular-nums text-accent w-14">
                  {formatTime(a.starts_at)}
                </div>
                <div className="text-sm flex-1 truncate">{a.title}</div>
                <div className="text-[10px] uppercase text-text-subtle">{a.kind}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultimi lead + pratiche */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden hover:shadow-card-hover transition-all">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ultimi lead</h2>
            <Link
              href="/leads"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1"
            >
              Tutti <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {latestLeads && latestLeads.length > 0 ? (
              latestLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="px-5 py-3 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-status-info/20 text-status-info text-[11px] font-medium flex items-center justify-center shrink-0">
                      {initials(lead.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{lead.full_name}</div>
                      <div className="text-xs text-text-subtle mt-0.5 truncate">
                        {lead.phone ?? "—"} · {formatDateTime(lead.created_at)}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg-hover text-text-muted shrink-0">
                      {LEAD_STATUS_LABELS[lead.status]}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-text-subtle">
                Nessun lead ancora.
              </div>
            )}
          </div>
        </div>

        <div className="card overflow-hidden hover:shadow-card-hover transition-all">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ultime pratiche</h2>
            <Link
              href="/cases"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1"
            >
              Tutte <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {latestCases && latestCases.length > 0 ? (
              latestCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="block px-5 py-3 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-[11px] font-medium flex items-center justify-center shrink-0">
                      {initials(c.customers?.full_name ?? "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {c.customers?.full_name ?? "—"}
                      </div>
                      <div className="text-xs text-text-subtle mt-0.5 truncate">
                        {[c.vehicles?.make, c.vehicles?.model, c.vehicles?.plate]
                          .filter(Boolean)
                          .join(" · ") || "Auto non specificata"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          CASE_STATUS_COLORS[c.status].bg
                        } ${CASE_STATUS_COLORS[c.status].text}`}
                      >
                        {CASE_STATUS_LABELS[c.status]}
                      </span>
                      <div className="text-xs font-medium tabular-nums mt-1">
                        {formatCurrency(c.price)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-text-subtle">
                Nessuna pratica ancora.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type StatCard = {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: string;
  stroke: string;
  data: number[];
};

function KpiCard({ stat }: { stat: StatCard }) {
  const Icon = stat.icon;
  return (
    <div className="card p-5 hover:border-border-hover hover:shadow-card-hover transition-all">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-text-muted">
          {stat.label}
        </div>
        <Icon className={`w-4 h-4 ${stat.color}`} strokeWidth={2} />
      </div>
      <div className="text-3xl font-semibold mt-3 tabular-nums">{stat.value}</div>
      <div className="mt-3 -mb-1">
        <Sparkline data={stat.data} stroke={stat.stroke} />
      </div>
    </div>
  );
}

function OnboardingGuide({
  profileDone,
  fbDone,
}: {
  profileDone: boolean;
  fbDone: boolean;
}) {
  const doneCount = [profileDone, fbDone].filter(Boolean).length;
  return (
    <div className="card p-6 mb-6 bg-gradient-to-br from-accent/10 to-transparent border-accent/30">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-base font-semibold">Benvenuto nel tuo CRM</h2>
        <span className="text-[11px] text-text-subtle tabular-nums shrink-0">
          {doneCount}/2 completati
        </span>
      </div>
      <p className="text-sm text-text-muted mb-4">
        Due passaggi rapidi per partire. La guida sparisce quando li hai completati
        entrambi.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OnboardingStep
          number={1}
          title="Compila i dati dell'officina"
          description="P.IVA, indirizzo, IBAN — serviranno nei preventivi."
          href="/settings"
          done={profileDone}
          label="Profilo"
        />
        <OnboardingStep
          number={2}
          title="Collega le campagne"
          description="Per ricevere i lead in automatico dalle Facebook Ads."
          href="/settings"
          done={fbDone}
          label="Facebook"
        />
      </div>
    </div>
  );
}

function OnboardingStep({
  number,
  title,
  description,
  href,
  done,
  label,
}: {
  number: number;
  title: string;
  description: string;
  href: string;
  done: boolean;
  label: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 mb-1 pr-8">
        <span className="text-xs uppercase tracking-wide text-text-subtle">
          {number}. {label}
        </span>
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-text-muted mt-1">{description}</div>
    </>
  );

  if (done) {
    return (
      <div
        aria-label={`${title} (completato)`}
        className="card p-4 border-status-success/40 bg-status-success/5 cursor-default relative overflow-hidden"
      >
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-status-success/20 text-status-success flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
        </div>
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="card p-4 border-border hover:border-accent hover:shadow-card-hover transition-all"
    >
      {inner}
    </Link>
  );
}
