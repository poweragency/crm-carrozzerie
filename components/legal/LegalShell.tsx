import Link from "next/link";
import { Wrench } from "lucide-react";

/**
 * Dati identificativi del fornitore del servizio (POWER AGENCY).
 * Fonte: visura Camera di Commercio MI — impresa individuale Amore Vincenzo.
 */
export const COMPANY = {
  legalName: "Amore Vincenzo",
  tradeName: "Power Agency",
  address: "Via Giuseppe Parini 2, 20019 Settimo Milanese (MI), Italia",
  vat: "12497340963",
  taxCode: "MRAVCN95C27F839R",
  rea: "MI-2675736",
  pec: "poweragency@pec.it",
  email: "info@poweragency.it",
  identifier:
    "Amore Vincenzo, impresa individuale operante con il nome commerciale «Power Agency», con sede legale in Via Giuseppe Parini 2, 20019 Settimo Milanese (MI), Italia — P.IVA 12497340963 — C.F. MRAVCN95C27F839R — REA MI-2675736 — PEC poweragency@pec.it",
} as const;

export type LegalSection = { heading: string; body: React.ReactNode[] };

export function LegalShell({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <Link href="/login" className="inline-flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold">CRM Officina</span>
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-text-subtle">Ultimo aggiornamento: {updated}</p>

        <div className="mt-10 flex flex-col gap-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-semibold mb-3">{s.heading}</h2>
              {s.body.map((p, i) => (
                <div
                  key={i}
                  className="text-[0.95rem] leading-relaxed text-text-muted mb-3"
                >
                  {p}
                </div>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-5 text-sm text-text-subtle">
          <Link href="/privacy" className="hover:text-text">
            Privacy
          </Link>
          <Link href="/cookie" className="hover:text-text">
            Cookie
          </Link>
          <Link href="/termini" className="hover:text-text">
            Termini
          </Link>
          <Link href="/login" className="hover:text-text">
            Accedi
          </Link>
          <span className="ml-auto">
            © 2026 {COMPANY.tradeName} · P.IVA {COMPANY.vat}
          </span>
        </div>
      </div>
    </div>
  );
}
