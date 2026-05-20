"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Field } from "@/components/case/Field";
import type { Customer, Database } from "@/types/database.types";

type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

type FieldType = "text" | "textarea" | "date" | "boolean" | "numeric" | "datetime";

interface FieldDef {
  key: keyof Customer;
  label: string;
  type?: FieldType;
  span?: 1 | 2;
  placeholder?: string;
}

interface SectionDef {
  title: string;
  fields: FieldDef[];
  defaultOpen?: boolean;
}

const SECTIONS: SectionDef[] = [
  {
    title: "Anagrafica completa",
    defaultOpen: true,
    fields: [
      { key: "cli_titolo", label: "Titolo", placeholder: "Sig./Dott./Ing." },
      { key: "cli_nome", label: "Nome / Ragione sociale", span: 2 },
      { key: "cli_nome_f", label: "Nome" },
      { key: "cli_nome_l", label: "Cognome" },
      { key: "cli_pers_fisi", label: "Persona fisica", type: "boolean" },
      { key: "cli_sesso", label: "Sesso (M/F)" },
      { key: "cli_nat_data", label: "Data di nascita", type: "date" },
      { key: "cli_nat_com", label: "Comune di nascita" },
      { key: "cli_nat_prov", label: "Provincia nascita" },
    ],
  },
  {
    title: "Indirizzo",
    fields: [
      { key: "cli_indi", label: "Via / indirizzo", span: 2 },
      { key: "cli_indirizzo_numero", label: "Civico" },
      { key: "cli_cap", label: "CAP" },
      { key: "cli_citta", label: "Città" },
      { key: "cli_prov", label: "Provincia" },
      { key: "cli_nazione", label: "Nazione" },
      { key: "cli_id_iso_nazione", label: "ISO nazione (IT/DE/...)" },
    ],
  },
  {
    title: "Contatti",
    fields: [
      { key: "cli_tel", label: "Telefono fisso" },
      { key: "cli_tel2", label: "Telefono 2" },
      { key: "cli_tel_cell", label: "Cellulare" },
      { key: "cli_fax", label: "Fax" },
      { key: "cli_email", label: "Email", span: 2 },
      { key: "cli_pec", label: "PEC", span: 2 },
    ],
  },
  {
    title: "Dati fiscali / fattura elettronica",
    fields: [
      { key: "cli_cod_fisc", label: "Codice fiscale" },
      { key: "cli_part_iva", label: "Partita IVA" },
      { key: "cli_destinatario_codice", label: "Codice destinatario SDI" },
      { key: "cli_codice_indice_pubblica_amministrazione", label: "Codice IPA" },
      { key: "cli_rec_iva", label: "Regime IVA" },
      { key: "cli_split_payment", label: "Split payment", type: "boolean" },
      {
        key: "cli_iva_esigibilita_differita",
        label: "IVA esigibilità differita",
        type: "boolean",
      },
      {
        key: "cli_consenso_trattamento_dati",
        label: "Consenso privacy",
        type: "boolean",
      },
      { key: "cli_ass_o_cp", label: "Assoggettato (cassa prof.)" },
      { key: "cli_codice_eori", label: "Codice EORI" },
      { key: "cli_riferimento_amministrazione", label: "Rif. amministrazione" },
      { key: "cli_id_iso_nazione_sede", label: "ISO nazione sede" },
      { key: "cli_pat_estera", label: "Partita estera", type: "boolean" },
    ],
  },
  {
    title: "Banca e pagamenti",
    fields: [
      { key: "cli_ban_iban", label: "IBAN", span: 2 },
      { key: "ban_cod", label: "Codice banca (ABI)" },
      { key: "cli_ban_cc", label: "C/C bancario" },
      { key: "cli_ban_cin", label: "CIN" },
      { key: "pag_cod", label: "Codice pagamento" },
      { key: "prof_cod", label: "Codice profilo" },
      { key: "cli_codice_conto", label: "Codice conto contabile" },
    ],
  },
  {
    title: "Patente",
    fields: [
      { key: "cli_pat_num", label: "Numero patente" },
      { key: "cli_pat_cat", label: "Categoria" },
      { key: "cli_pat_by", label: "Rilasciata da" },
      { key: "cli_pat_ril_luogo", label: "Luogo rilascio" },
      { key: "cli_pat_data_ril", label: "Data rilascio", type: "date" },
      { key: "cli_pat_data_scad", label: "Scadenza", type: "date" },
    ],
  },
  {
    title: "Carta d'identità",
    fields: [
      { key: "cli_cartaid", label: "Numero documento", span: 2 },
      { key: "cli_cartaid_ril_da", label: "Rilasciata da" },
      { key: "cli_cartaid_ril_data", label: "Data rilascio", type: "date" },
      { key: "cli_cartaid_data_scad", label: "Scadenza", type: "date" },
    ],
  },
  {
    title: "Note",
    fields: [{ key: "cli_note", label: "Note", type: "textarea", span: 2 }],
  },
  {
    title: "Dati tecnici (gestionale)",
    fields: [
      { key: "cli_cod", label: "cli_cod" },
      { key: "cli_codice", label: "cli_codice" },
      { key: "cli_id", label: "cli_id" },
      { key: "prs_cod_contatto", label: "prs_cod_contatto" },
      { key: "prs_cod_segnalato_da", label: "prs_cod_segnalato_da" },
      { key: "cativa_id", label: "cativa_id" },
      { key: "rf_id", label: "rf_id" },
      { key: "cli_cnt_id", label: "cli_cnt_id" },
      { key: "cli_indi_lat", label: "Latitudine", type: "numeric" },
      { key: "cli_indi_lng", label: "Longitudine", type: "numeric" },
      {
        key: "cli_ultima_modifica",
        label: "Ultima modifica gestionale",
        type: "datetime",
      },
      { key: "cli_data_creazione", label: "Data creazione gestionale", type: "datetime" },
    ],
  },
];

function toFormString(v: unknown, type: FieldType): string {
  if (v === null || v === undefined) return "";
  if (type === "date" && typeof v === "string") return v.slice(0, 10);
  if (type === "datetime" && typeof v === "string") return v.slice(0, 16);
  if (type === "boolean") return v ? "true" : "false";
  return String(v);
}

function fromForm(value: string, type: FieldType): unknown {
  const v = value.trim();
  if (type === "boolean") {
    if (v === "true") return true;
    if (v === "false") return false;
    return null;
  }
  if (v === "") return null;
  if (type === "numeric") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (type === "datetime") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return v;
}

interface Props {
  customer: Customer;
  onUpdate: (next: Customer) => void;
}

export function CustomerGestionalePanel({ customer, onUpdate }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.title, s.defaultOpen ?? false]))
  );

  const initialForm = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const s of SECTIONS) {
      for (const f of s.fields) {
        out[f.key as string] = toFormString(customer[f.key], f.type ?? "text");
      }
    }
    return out;
  }, [customer]);

  const [form, setForm] = useState<Record<string, string>>(initialForm);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const update: Record<string, unknown> = {};
      for (const s of SECTIONS) {
        for (const f of s.fields) {
          const type = f.type ?? "text";
          update[f.key as string] = fromForm(form[f.key as string] ?? "", type);
        }
      }
      const { data, error } = await supabase
        .from("customers")
        .update(update as CustomerUpdate)
        .eq("id", customer.id)
        .select()
        .single();
      if (error || !data) {
        toast.error("Salvataggio fallito", { description: error?.message });
        return;
      }
      onUpdate(data);
      setDirty(false);
      toast.success("Dati gestionale aggiornati");
    } finally {
      setSaving(false);
    }
  }

  function toggle(title: string) {
    setOpenSections((s) => ({ ...s, [title]: !s[title] }));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
          Dati gestionale completi
        </h2>
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary py-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Salvataggio..." : "Salva dati gestionale"}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {SECTIONS.map((s) => {
          const open = openSections[s.title];
          const populated = s.fields.filter((f) => {
            const v = customer[f.key];
            return v !== null && v !== undefined && v !== "";
          }).length;
          return (
            <div key={s.title} className="rounded-md border border-border bg-bg-elevated">
              <button
                type="button"
                onClick={() => toggle(s.title)}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-bg-hover transition-colors text-left"
              >
                {open ? (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                )}
                <span className="text-sm font-medium">{s.title}</span>
                <span className="text-[11px] text-text-subtle ml-auto">
                  {populated}/{s.fields.length} compilati
                </span>
              </button>
              {open && (
                <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {s.fields.map((f) => {
                    const type = f.type ?? "text";
                    const id = `gest-${f.key as string}`;
                    return (
                      <Field
                        key={f.key as string}
                        label={f.label}
                        htmlFor={id}
                        className={cn(f.span === 2 && "sm:col-span-2")}
                      >
                        {type === "textarea" ? (
                          <textarea
                            id={id}
                            value={form[f.key as string] ?? ""}
                            onChange={(e) => setField(f.key as string, e.target.value)}
                            className="input-base min-h-[80px]"
                            placeholder={f.placeholder}
                          />
                        ) : type === "boolean" ? (
                          <select
                            id={id}
                            value={form[f.key as string] ?? ""}
                            onChange={(e) => setField(f.key as string, e.target.value)}
                            className="input-base"
                          >
                            <option value="">—</option>
                            <option value="true">Sì</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            id={id}
                            type={
                              type === "date"
                                ? "date"
                                : type === "datetime"
                                  ? "datetime-local"
                                  : type === "numeric"
                                    ? "number"
                                    : "text"
                            }
                            step={type === "numeric" ? "any" : undefined}
                            value={form[f.key as string] ?? ""}
                            onChange={(e) => setField(f.key as string, e.target.value)}
                            className="input-base"
                            placeholder={f.placeholder}
                          />
                        )}
                      </Field>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
