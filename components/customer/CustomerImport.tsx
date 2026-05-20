"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Database } from "@/types/database.types";

type Row = Record<string, unknown>;
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];

// Colonne del gestionale e relativi tipi attesi nel DB
type ColType = "text" | "boolean" | "date" | "timestamp" | "numeric";

const COLUMNS: { name: string; type: ColType }[] = [
  { name: "cli_cod", type: "text" },
  { name: "cli_codice", type: "text" },
  { name: "cli_ultima_modifica", type: "timestamp" },
  { name: "cli_nome", type: "text" },
  { name: "cli_nome_f", type: "text" },
  { name: "cli_nome_l", type: "text" },
  { name: "cli_indi", type: "text" },
  { name: "cli_cap", type: "text" },
  { name: "cli_citta", type: "text" },
  { name: "cli_prov", type: "text" },
  { name: "cli_nazione", type: "text" },
  { name: "cli_tel", type: "text" },
  { name: "cli_tel2", type: "text" },
  { name: "cli_fax", type: "text" },
  { name: "cli_tel_cell", type: "text" },
  { name: "cli_email", type: "text" },
  { name: "cli_rec_iva", type: "text" },
  { name: "cli_cod_fisc", type: "text" },
  { name: "cli_part_iva", type: "text" },
  { name: "cli_pers_fisi", type: "boolean" },
  { name: "cli_sesso", type: "text" },
  { name: "cli_nat_data", type: "date" },
  { name: "cli_nat_com", type: "text" },
  { name: "cli_nat_prov", type: "text" },
  { name: "cli_ass_o_cp", type: "text" },
  { name: "cli_ban_iban", type: "text" },
  { name: "cli_ban_cc", type: "text" },
  { name: "ban_cod", type: "text" },
  { name: "prof_cod", type: "text" },
  { name: "pag_cod", type: "text" },
  { name: "cli_ban_cin", type: "text" },
  { name: "cli_note", type: "text" },
  { name: "cli_codice_conto", type: "text" },
  { name: "cli_pat_num", type: "text" },
  { name: "cli_pat_cat", type: "text" },
  { name: "cli_pat_by", type: "text" },
  { name: "cli_pat_data_ril", type: "date" },
  { name: "cli_pat_data_scad", type: "date" },
  { name: "cli_consenso_trattamento_dati", type: "boolean" },
  { name: "cli_cartaid", type: "text" },
  { name: "cli_cartaid_ril_da", type: "text" },
  { name: "cli_cartaid_ril_data", type: "date" },
  { name: "cli_cartaid_data_scad", type: "date" },
  { name: "prs_cod_contatto", type: "text" },
  { name: "prs_cod_segnalato_da", type: "text" },
  { name: "cli_iva_esigibilita_differita", type: "boolean" },
  { name: "cli_codice_indice_pubblica_amministrazione", type: "text" },
  { name: "cli_id_iso_nazione", type: "text" },
  { name: "cli_titolo", type: "text" },
  { name: "cli_codice_eori", type: "text" },
  { name: "cli_id_iso_nazione_sede", type: "text" },
  { name: "cli_id", type: "text" },
  { name: "cli_split_payment", type: "boolean" },
  { name: "cativa_id", type: "text" },
  { name: "cli_indi_lat", type: "numeric" },
  { name: "cli_pat_estera", type: "boolean" },
  { name: "cli_pat_ril_luogo", type: "text" },
  { name: "cli_indi_lng", type: "numeric" },
  { name: "cli_destinatario_codice", type: "text" },
  { name: "cli_pec", type: "text" },
  { name: "cli_indirizzo_numero", type: "text" },
  { name: "rf_id", type: "text" },
  { name: "cli_riferimento_amministrazione", type: "text" },
  { name: "cli_cnt_id", type: "text" },
  { name: "cli_data_creazione", type: "timestamp" },
];

const COLUMN_TYPES: Record<string, ColType> = Object.fromEntries(
  COLUMNS.map((c) => [c.name, c.type])
);
const KNOWN_COLUMNS = new Set(COLUMNS.map((c) => c.name));

function normalizeBoolean(v: unknown): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "vero", "si", "sì", "s", "y", "yes", "t", "x"].includes(s))
    return true;
  if (["0", "false", "falso", "no", "n", "f", ""].includes(s)) return false;
  return null;
}

function normalizeNumeric(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (s === "") return null;
  // dd/mm/yyyy o dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = (Number(yyyy) > 50 ? "19" : "20") + yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normalizeTimestamp(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return v.toISOString();
  }
  const s = String(v).trim();
  if (s === "") return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  const asDate = normalizeDate(s);
  return asDate ? `${asDate}T00:00:00Z` : null;
}

function normalizeText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function deriveFullName(row: Row): string {
  const nome = normalizeText(row.cli_nome);
  if (nome) return nome;
  const f = normalizeText(row.cli_nome_f);
  const l = normalizeText(row.cli_nome_l);
  const joined = [l, f].filter(Boolean).join(" ").trim();
  return joined || "Cliente senza nome";
}

function buildInsertRow(row: Row): Record<string, unknown> {
  const out: Record<string, unknown> = { full_name: deriveFullName(row) };
  const phone = normalizeText(row.cli_tel_cell) ?? normalizeText(row.cli_tel);
  if (phone) out.phone = phone;
  const email = normalizeText(row.cli_email);
  if (email) out.email = email;

  for (const { name, type } of COLUMNS) {
    const raw = row[name];
    if (raw === undefined) continue;
    let val: unknown = null;
    switch (type) {
      case "text":
        val = normalizeText(raw);
        break;
      case "boolean":
        val = normalizeBoolean(raw);
        break;
      case "date":
        val = normalizeDate(raw);
        break;
      case "timestamp":
        val = normalizeTimestamp(raw);
        break;
      case "numeric":
        val = normalizeNumeric(raw);
        break;
    }
    if (val !== null) out[name] = val;
  }
  return out;
}

export function CustomerImport() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done, setDone] = useState<{ inserted: number; failed: number } | null>(null);

  const unknownCols = useMemo(
    () => headers.filter((h) => !KNOWN_COLUMNS.has(h)),
    [headers]
  );
  const matchedCols = useMemo(
    () => headers.filter((h) => KNOWN_COLUMNS.has(h)),
    [headers]
  );

  async function handleFile(file: File) {
    setParsing(true);
    setDone(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: true });
      if (json.length === 0) {
        toast.error("Il foglio è vuoto");
        return;
      }
      const hdrs = Object.keys(json[0] ?? {});
      setHeaders(hdrs);
      setRows(json);
      setFileName(file.name);
      toast.success(`${json.length} righe lette da ${file.name}`);
    } catch (err) {
      toast.error("Impossibile leggere il file", {
        description: err instanceof Error ? err.message : "Errore sconosciuto",
      });
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    let inserted = 0;
    let failed = 0;
    const BATCH = 50;
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH).map(buildInsertRow) as CustomerInsert[];
        const { data, error } = await supabase
          .from("customers")
          .insert(slice)
          .select("id");
        if (error) {
          failed += slice.length;
          toast.error(`Errore batch ${i / BATCH + 1}`, { description: error.message });
        } else {
          inserted += data?.length ?? 0;
        }
        setProgress({ done: Math.min(i + BATCH, rows.length), total: rows.length });
      }
      setDone({ inserted, failed });
      if (failed === 0) toast.success(`${inserted} clienti importati`);
      else toast.warning(`${inserted} importati, ${failed} falliti`);
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }

  function reset() {
    setRows([]);
    setHeaders([]);
    setFileName(null);
    setDone(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const previewRows = rows.slice(0, 5);
  const previewCols = matchedCols.slice(0, 8);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Clienti", href: "/customers" },
            { label: "Importa da Excel" },
          ]}
        />
      </div>

      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Importa clienti da Excel</h1>
          <p className="text-sm text-text-muted mt-1">
            Carica l&apos;export del gestionale (.xlsx o .xls). Le colonne riconosciute
            vengono mappate automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/customers")}
          className="btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" /> Indietro
        </button>
      </div>

      {!fileName && (
        <div
          className={cn(
            "card border-dashed border-2 border-border p-12 text-center cursor-pointer hover:border-accent transition-colors",
            parsing && "opacity-50 pointer-events-none"
          )}
          onClick={() => inputRef.current?.click()}
        >
          <FileSpreadsheet className="w-10 h-10 text-text-subtle mx-auto mb-3" />
          <div className="text-base font-medium">
            {parsing
              ? "Lettura in corso..."
              : "Trascina il file qui o clicca per caricarlo"}
          </div>
          <p className="text-xs text-text-subtle mt-2">
            Formati supportati: .xlsx, .xls (la prima riga deve contenere le intestazioni)
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}

      {fileName && (
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="w-6 h-6 text-accent shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{fileName}</div>
                  <p className="text-xs text-text-subtle mt-0.5">
                    {rows.length} righe · {matchedCols.length}/{headers.length} colonne
                    riconosciute
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="btn-secondary py-1.5"
                disabled={importing}
                type="button"
              >
                Cambia file
              </button>
            </div>

            {unknownCols.length > 0 && (
              <div className="mt-4 rounded-md border border-status-warning/40 bg-status-warning/5 p-3 text-xs">
                <div className="flex items-center gap-2 font-medium text-status-warning mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {unknownCols.length} colonne non riconosciute (ignorate)
                </div>
                <div className="text-text-muted break-words">
                  {unknownCols.join(", ")}
                </div>
              </div>
            )}
          </div>

          {previewRows.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold">Anteprima (prime 5 righe)</h2>
              </div>
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-xs">
                  <thead className="bg-bg-hover/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-text-muted">
                        Nome derivato
                      </th>
                      {previewCols.map((c) => (
                        <th
                          key={c}
                          className="text-left px-3 py-2 font-medium text-text-muted"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-bg-hover/30">
                        <td className="px-3 py-2 font-medium text-accent">
                          {deriveFullName(r)}
                        </td>
                        {previewCols.map((c) => {
                          const val = r[c];
                          const display =
                            val instanceof Date
                              ? val.toLocaleDateString("it-IT")
                              : val === null || val === undefined
                                ? "—"
                                : String(val);
                          return (
                            <td
                              key={c}
                              className="px-3 py-2 text-text-muted max-w-[160px] truncate"
                              title={display}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewCols.length < matchedCols.length && (
                <div className="px-5 py-2 text-[11px] text-text-subtle border-t border-border">
                  Mostrate {previewCols.length} di {matchedCols.length} colonne
                  riconosciute. L&apos;import include tutte le colonne riconosciute.
                </div>
              )}
            </div>
          )}

          {done ? (
            <div className="card p-5">
              <div className="flex items-center gap-3 text-status-success">
                <Check className="w-5 h-5" />
                <div>
                  <div className="font-medium">Import completato</div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {done.inserted} clienti inseriti
                    {done.failed > 0 ? `, ${done.failed} falliti` : ""}.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/customers")}
                  className="btn-primary"
                >
                  Vai alla lista clienti
                </button>
                <button type="button" onClick={reset} className="btn-secondary">
                  Nuovo import
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3">
              {progress && (
                <span className="text-xs text-text-muted tabular-nums">
                  {progress.done}/{progress.total} righe
                </span>
              )}
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || rows.length === 0}
                className="btn-primary"
              >
                <Upload className="w-4 h-4" />
                {importing ? "Importazione..." : `Importa ${rows.length} clienti`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
