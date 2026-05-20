"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Phone, Mail, SlidersHorizontal, X as XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER } from "@/lib/constants";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-status-info/20 text-status-info",
  "bg-status-success/20 text-status-success",
  "bg-chart-5/20 text-chart-5",
  "bg-status-warning/20 text-status-warning",
  "bg-accent/20 text-accent",
];
import { caseFormSchema } from "@/lib/schemas";
import { CasePanel } from "./case/CasePanel";
import { Field } from "./case/Field";
import { CustomerFormModal } from "./customer/CustomerFormModal";
import { VehicleFormModal } from "./customer/VehicleFormModal";
import { Combobox } from "./ui/Combobox";
import type { Case, CaseStatus, Customer, Vehicle } from "@/types/database.types";

export type CaseWithRelations = Case & {
  customers: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  vehicles: { make: string | null; model: string | null; plate: string | null } | null;
};

export function CasesTable({ initialCases }: { initialCases: CaseWithRelations[] }) {
  const router = useRouter();
  const [cases] = useState<CaseWithRelations[]>(initialCases);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [insuranceFilter, setInsuranceFilter] = useState("");
  const [sortBy, setSortBy] = useState<
    "date-desc" | "date-asc" | "price-desc" | "price-asc"
  >("date-desc");

  const insuranceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of cases) {
      if (c.insurance_company) set.add(c.insurance_company);
    }
    return Array.from(set).sort();
  }, [cases]);

  const activeFiltersCount =
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0) +
    (insuranceFilter ? 1 : 0);

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setPriceMin("");
    setPriceMax("");
    setInsuranceFilter("");
    setSortBy("date-desc");
  }

  const filtered = useMemo(() => {
    const min = priceMin === "" ? null : Number(priceMin);
    const max = priceMax === "" ? null : Number(priceMax);
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    const list = cases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (insuranceFilter && c.insurance_company !== insuranceFilter) return false;

      const price = Number(c.price ?? 0);
      if (min !== null && price < min) return false;
      if (max !== null && price > max) return false;

      const created = new Date(c.created_at).getTime();
      if (from !== null && created < from) return false;
      if (to !== null && created > to) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.customers?.full_name.toLowerCase().includes(q) ||
        c.customers?.phone?.toLowerCase().includes(q) ||
        c.customers?.email?.toLowerCase().includes(q) ||
        c.vehicles?.make?.toLowerCase().includes(q) ||
        c.vehicles?.model?.toLowerCase().includes(q) ||
        c.vehicles?.plate?.toLowerCase().includes(q) ||
        c.insurance_company?.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortBy === "date-desc")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "date-asc")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "price-desc") return Number(b.price ?? 0) - Number(a.price ?? 0);
      return Number(a.price ?? 0) - Number(b.price ?? 0);
    });
    return list;
  }, [
    cases,
    search,
    statusFilter,
    dateFrom,
    dateTo,
    priceMin,
    priceMax,
    insuranceFilter,
    sortBy,
  ]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Pratiche</h1>
          <p className="text-xs text-text-subtle">
            {cases.length} pratic{cases.length === 1 ? "a" : "he"} totali
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CaseStatus | "all")}
            className="input-base w-44"
          >
            <option value="all">Tutti gli stati</option>
            {CASE_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {CASE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search
              className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 -translate-y-1/2"
              strokeWidth={2}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca cliente, targa, assicurazione..."
              className="input-base pl-8 w-72"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "btn-secondary relative",
              showFilters && "border-accent text-accent"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtri
            {activeFiltersCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center text-[10px] font-semibold min-w-[18px] h-[18px] rounded-full bg-accent text-accent-contrast px-1">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary" type="button">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuova pratica
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="px-8 py-3 border-b border-border bg-bg-card/50 flex items-end gap-3 flex-wrap animate-slide-up">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-subtle font-medium block mb-1">
              Aperta dal
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-base w-40"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-subtle font-medium block mb-1">
              al
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-base w-40"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-subtle font-medium block mb-1">
              Prezzo min €
            </label>
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="0"
              className="input-base w-28"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-subtle font-medium block mb-1">
              Prezzo max €
            </label>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="∞"
              className="input-base w-28"
            />
          </div>
          {insuranceOptions.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-subtle font-medium block mb-1">
                Assicurazione
              </label>
              <select
                value={insuranceFilter}
                onChange={(e) => setInsuranceFilter(e.target.value)}
                className="input-base w-48"
              >
                <option value="">Tutte</option>
                {insuranceOptions.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-subtle font-medium block mb-1">
              Ordina per
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="input-base w-48"
            >
              <option value="date-desc">Più recenti</option>
              <option value="date-asc">Più vecchie</option>
              <option value="price-desc">Prezzo (alto → basso)</option>
              <option value="price-asc">Prezzo (basso → alto)</option>
            </select>
          </div>
          {activeFiltersCount > 0 && (
            <button type="button" onClick={resetFilters} className="btn-ghost text-xs">
              <XIcon className="w-3.5 h-3.5" />
              Azzera filtri
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto p-8">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-hover/50">
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Cliente
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Contatti
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Veicolo
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Assicurazione
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Stato
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Prezzo
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Aperta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-sm text-text-subtle py-10">
                    {cases.length === 0
                      ? "Nessuna pratica. Sposta un lead in 'Cliente' nel Kanban o crea una nuova pratica."
                      : "Nessun risultato."}
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => {
                  const avatarColor =
                    AVATAR_COLORS[
                      (c.customers?.full_name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
                    ];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/cases/${c.id}`)}
                      className={cn(
                        "transition-colors cursor-pointer group border-l-2 border-transparent",
                        idx % 2 === 1 && "bg-bg-hover/30",
                        "hover:bg-bg-hover hover:border-l-accent"
                      )}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ring-2 ring-transparent group-hover:ring-accent/30 transition-all",
                              avatarColor
                            )}
                          >
                            {initials(c.customers?.full_name ?? "?")}
                          </div>
                          <span className="text-sm font-medium truncate">
                            {c.customers?.full_name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-0.5">
                          {c.customers?.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-text-muted">
                              <Phone className="w-3 h-3" strokeWidth={2} />
                              {c.customers.phone}
                            </div>
                          )}
                          {c.customers?.email && (
                            <div className="flex items-center gap-1.5 text-xs text-text-muted">
                              <Mail className="w-3 h-3" strokeWidth={2} />
                              <span className="truncate max-w-[180px]">
                                {c.customers.email}
                              </span>
                            </div>
                          )}
                          {!c.customers?.phone && !c.customers?.email && (
                            <span className="text-xs text-text-subtle">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-text-muted">
                        {[c.vehicles?.make, c.vehicles?.model]
                          .filter(Boolean)
                          .join(" ") || "—"}
                        {c.vehicles?.plate && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-bg-hover font-mono">
                            {c.vehicles.plate}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-text-muted">
                        {c.insurance_company ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <CaseStatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-3 text-sm tabular-nums">
                        {formatCurrency(c.price)}
                      </td>
                      <td className="px-5 py-3 text-xs text-text-muted">
                        {formatDate(c.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NewCaseModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            router.push(`/cases/${id}`);
          }}
        />
      )}
    </div>
  );
}

function NewCaseModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  const [caseForm, setCaseForm] = useState({
    status: "preparazione" as CaseStatus,
    description: null as string | null,
    price: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: vs }] = await Promise.all([
        supabase.from("customers").select("*").order("full_name", { ascending: true }),
        supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      ]);
      setCustomers(cs ?? []);
      setVehicles(vs ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  const filteredVehicles = useMemo(
    () => (customerId ? vehicles.filter((v) => v.customer_id === customerId) : []),
    [vehicles, customerId]
  );

  function handleCustomerChange(value: string) {
    setCustomerId(value);
    setVehicleId(""); // reset veicolo quando cambia cliente
    setErrors((e) => {
      const n = { ...e };
      delete n["customer"];
      return n;
    });
  }

  const collator = useMemo(
    () => new Intl.Collator("it", { sensitivity: "base", numeric: true }),
    []
  );

  const customerOptions = useMemo(
    () =>
      [...customers]
        .sort((a, b) => collator.compare(a.full_name, b.full_name))
        .map((c) => ({
          value: c.id,
          label: c.full_name,
          subLabel: [c.phone, c.email].filter(Boolean).join(" · ") || undefined,
        })),
    [customers, collator]
  );

  const vehicleOptions = useMemo(
    () =>
      [...filteredVehicles]
        .sort((a, b) => {
          const la = [a.make, a.model].filter(Boolean).join(" ") || a.plate || "";
          const lb = [b.make, b.model].filter(Boolean).join(" ") || b.plate || "";
          return collator.compare(la, lb);
        })
        .map((v) => ({
          value: v.id,
          label: [v.make, v.model].filter(Boolean).join(" ") || "Veicolo senza marca",
          subLabel:
            [v.plate, v.year ? String(v.year) : null, v.color]
              .filter(Boolean)
              .join(" · ") || undefined,
        })),
    [filteredVehicles, collator]
  );

  async function handleSave() {
    setErrors({});
    const flat: Record<string, string> = {};
    if (!customerId) flat["customer"] = "Seleziona un cliente";
    const caseResult = caseFormSchema.safeParse(caseForm);
    if (!caseResult.success) {
      for (const i of caseResult.error.issues)
        flat[`case.${String(i.path[0])}`] = i.message;
    }
    if (Object.keys(flat).length > 0) {
      setErrors(flat);
      toast.error("Controlla i campi evidenziati");
      return;
    }
    if (!caseResult.success) return;

    setSaving(true);
    try {
      const { data: caseRow, error: caseErr } = await supabase
        .from("cases")
        .insert({
          customer_id: customerId,
          vehicle_id: vehicleId || null,
          status: caseResult.data.status,
          description: caseResult.data.description,
          price: caseResult.data.price,
        })
        .select()
        .single();
      if (caseErr || !caseRow) throw new Error(caseErr?.message ?? "Errore pratica");

      toast.success("Pratica creata");
      onCreated(caseRow.id);
    } catch (e) {
      toast.error("Creazione fallita", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  function clearError(path: string) {
    if (!errors[path]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Nuova pratica</h2>
          <p className="text-xs text-text-subtle mt-0.5">
            Seleziona cliente e veicolo, poi compila i dati della pratica.
          </p>
        </div>
        <div className="p-5 space-y-6">
          <div className="space-y-3">
            <Field label="Cliente *" htmlFor="nc-customer" error={errors["customer"]}>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    id="nc-customer"
                    value={customerId}
                    onChange={handleCustomerChange}
                    options={customerOptions}
                    disabled={loading}
                    placeholder={loading ? "Caricamento..." : "— Seleziona cliente —"}
                    emptyLabel="Nessun cliente trovato"
                    ariaLabel="Seleziona cliente"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="btn-secondary py-1.5 shrink-0"
                  title="Crea un nuovo cliente"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nuovo
                </button>
              </div>
            </Field>

            <Field
              label="Veicolo"
              htmlFor="nc-vehicle"
              hint={
                !customerId
                  ? "Seleziona prima un cliente per vedere le sue vetture"
                  : filteredVehicles.length === 0
                    ? "Il cliente non ha ancora vetture — usa '+ Nuovo'"
                    : undefined
              }
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    id="nc-vehicle"
                    value={vehicleId}
                    onChange={setVehicleId}
                    options={vehicleOptions}
                    disabled={!customerId || loading || vehicleOptions.length === 0}
                    placeholder={
                      !customerId
                        ? "— Seleziona prima un cliente —"
                        : vehicleOptions.length === 0
                          ? "— Nessun veicolo —"
                          : "— Nessuno —"
                    }
                    emptyLabel="Nessun veicolo trovato"
                    ariaLabel="Seleziona veicolo"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(true)}
                  disabled={!customerId}
                  className="btn-secondary py-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    customerId
                      ? "Aggiungi un veicolo a questo cliente"
                      : "Seleziona prima un cliente"
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nuovo
                </button>
              </div>
            </Field>
          </div>

          <CasePanel
            values={caseForm}
            errors={{
              status: errors["case.status"],
              description: errors["case.description"],
              price: errors["case.price"],
            }}
            onChange={(patch) => {
              setCaseForm((c) => ({ ...c, ...patch }));
              for (const k of Object.keys(patch) as string[]) clearError(`case.${k}`);
            }}
          />
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary" type="button">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="btn-primary"
            type="button"
          >
            {saving ? "Salvataggio..." : "Crea pratica"}
          </button>
        </div>
      </div>

      {showCustomerModal && (
        <CustomerFormModal
          onClose={() => setShowCustomerModal(false)}
          onSaved={(c) => {
            setCustomers((prev) => [...prev, c]);
            setCustomerId(c.id);
            setVehicleId("");
            setShowCustomerModal(false);
          }}
        />
      )}

      {showVehicleModal && customerId && (
        <VehicleFormModal
          customerId={customerId}
          onClose={() => setShowVehicleModal(false)}
          onSaved={(v) => {
            setVehicles((prev) => [...prev, v]);
            setVehicleId(v.id);
            setShowVehicleModal(false);
          }}
        />
      )}
    </div>
  );
}
