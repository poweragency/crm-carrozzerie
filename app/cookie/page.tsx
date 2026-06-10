import type { Metadata } from "next";
import { LegalShell, COMPANY } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Cookie Policy — CRM Officina",
  description: "Informativa sull'uso dei cookie del servizio CRM Officina.",
};

export default function CookiePage() {
  return (
    <LegalShell
      title="Cookie Policy"
      updated="giugno 2026"
      sections={[
        {
          heading: "1. Titolare",
          body: [
            <>Titolare è {COMPANY.identifier}. Contatti: <a className="text-accent underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</>,
          ],
        },
        {
          heading: "2. Cosa sono i cookie",
          body: [
            <>
              I cookie sono piccoli file di testo che i siti salvano sul dispositivo dell’utente per
              funzionare correttamente, ricordare le preferenze o raccogliere statistiche. Possono essere
              tecnici (necessari) o di profilazione, di prima o di terza parte.
            </>,
          ],
        },
        {
          heading: "3. Cookie utilizzati",
          body: [
            <>
              CRM Officina utilizza esclusivamente <strong>cookie tecnici</strong> necessari
              all’autenticazione, al mantenimento della sessione e alla sicurezza (gestiti dal provider di
              autenticazione). Viene inoltre memorizzata la preferenza del tema chiaro/scuro. Non utilizziamo
              cookie di profilazione o di marketing di terze parti.
            </>,
            <>I cookie tecnici non richiedono il consenso preventivo ai sensi dell’art. 122 del Codice Privacy.</>,
          ],
        },
        {
          heading: "4. Gestione delle preferenze",
          body: [
            <>
              Puoi gestire o eliminare i cookie in qualsiasi momento dalle impostazioni del browser. La
              disattivazione dei cookie tecnici può compromettere l’accesso e il funzionamento del servizio.
            </>,
          ],
        },
        {
          heading: "5. Riferimenti",
          body: [
            <>Per il trattamento complessivo dei dati personali consulta la <a className="text-accent underline" href="/privacy">Privacy Policy</a>.</>,
          ],
        },
      ]}
    />
  );
}
