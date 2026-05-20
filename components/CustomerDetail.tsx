"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { customerFormSchema, type CustomerFormValues } from "@/lib/schemas";
import { useConfirm } from "./ConfirmDialog";
import { Breadcrumb } from "./ui/Breadcrumb";
import { formatDateTime, initials } from "@/lib/utils";
import { Field, Section } from "./case/Field";
import { VehiclesPanel } from "./customer/VehiclesPanel";
import { CustomerCasesPanel, type CustomerCase } from "./customer/CustomerCasesPanel";
import { CustomerGestionalePanel } from "./customer/CustomerGestionalePanel";
import type { Customer, Vehicle } from "@/types/database.types";

interface Props {
  initialCustomer: Customer;
  initialVehicles: Vehicle[];
  initialCases: CustomerCase[];
}

export function CustomerDetail({
  initialCustomer,
  initialVehicles,
  initialCases,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();

  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [form, setForm] = useState<CustomerFormValues>({
    full_name: initialCustomer.full_name,
    phone: initialCustomer.phone,
    email: initialCustomer.email,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormValues, string>>>(
    {}
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function setField<K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setDirty(true);
  }

  async function handleSave() {
    const result = customerFormSchema.safeParse(form);
    if (!result.success) {
      const flat: Partial<Record<keyof CustomerFormValues, string>> = {};
      for (const issue of result.error.issues) {
        flat[issue.path[0] as keyof CustomerFormValues] = issue.message;
      }
      setErrors(flat);
      toast.error("Controlla i campi");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("customers")
      .update(result.data)
      .eq("id", customer.id)
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("Salvataggio fallito", { description: error?.message });
      return;
    }
    setCustomer(data);
    setDirty(false);
    toast.success("Cliente aggiornato");
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Eliminare ${customer.full_name}?`,
      description:
        "Verranno eliminate anche tutte le sue pratiche, vetture, documenti e note. Operazione non reversibile.",
      confirmLabel: "Elimina",
      variant: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    if (error) {
      toast.error("Eliminazione fallita", { description: error.message });
      return;
    }
    toast.success("Cliente eliminato");
    router.push("/customers");
  }

  return (
    <div className="max-w-4xl mx-auto p-8 pb-32">
      <div className="sticky top-0 -mx-8 px-8 py-2 bg-bg/95 backdrop-blur z-20 border-b border-border/50 mb-4">
        <Breadcrumb
          items={[
            { label: "Clienti", href: "/customers" },
            { label: customer.full_name },
          ]}
        />
      </div>

      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-full bg-accent/20 text-accent text-base font-semibold flex items-center justify-center shrink-0">
            {initials(customer.full_name)}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate">{customer.full_name}</h1>
            <p className="text-xs text-text-subtle mt-0.5">
              Cliente dal {formatDateTime(customer.created_at)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="btn-ghost text-status-danger hover:bg-status-danger/10 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          Elimina
        </button>
      </div>

      <div className="space-y-8">
        <Section title="Anagrafica">
          <Field label="Nome completo *" htmlFor="cust-name" error={errors.full_name}>
            <input
              id="cust-name"
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              className="input-base"
              placeholder="Mario Rossi"
            />
          </Field>
          <Field label="Telefono" htmlFor="cust-phone" error={errors.phone}>
            <input
              id="cust-phone"
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => setField("phone", e.target.value || null)}
              className="input-base"
              placeholder="+39 333 1234567"
            />
          </Field>
          <Field label="Email" htmlFor="cust-email" error={errors.email}>
            <input
              id="cust-email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setField("email", e.target.value || null)}
              className="input-base"
              placeholder="mario@example.com"
            />
          </Field>
        </Section>

        <div className="border-t border-border pt-6">
          <CustomerGestionalePanel customer={customer} onUpdate={setCustomer} />
        </div>

        <div className="border-t border-border pt-6">
          <VehiclesPanel customerId={customer.id} initialVehicles={initialVehicles} />
        </div>

        <div className="border-t border-border pt-6">
          <CustomerCasesPanel cases={initialCases} />
        </div>
      </div>

      {/* Save bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-60 px-8 py-3 bg-bg-card/95 backdrop-blur border-t border-border z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
          {dirty && (
            <span className="text-xs text-status-warning">Modifiche non salvate</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
