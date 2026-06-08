import type { Metadata } from "next";
import { LegalShell, COMPANY } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy — CRM Officina",
  description:
    "Informativa sul trattamento dei dati personali del servizio CRM Officina.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="giugno 2026"
      sections={[
        {
          heading: "1. Titolare e ruoli nel trattamento",
          body: [
            <>
              Il servizio CRM Officina è fornito da {COMPANY.identifier} (di seguito il
              “Fornitore”).
            </>,
            <>
              Per i dati relativi all’account dell’officina cliente (utente, abbonamento,
              fatturazione) il Fornitore agisce in qualità di{" "}
              <strong>titolare del trattamento</strong>. Per i dati che l’officina cliente
              carica e gestisce tramite la piattaforma (anagrafiche dei propri clienti,
              lead, pratiche, preventivi), il Fornitore agisce in qualità di{" "}
              <strong>responsabile del trattamento</strong> (art. 28 GDPR) per conto
              dell’officina, che ne resta titolare.
            </>,
            <>
              Per qualsiasi richiesta scrivere a{" "}
              <a className="text-accent underline" href={`mailto:${COMPANY.email}`}>
                {COMPANY.email}
              </a>{" "}
              — PEC {COMPANY.pec}.
            </>,
          ],
        },
        {
          heading: "2. Dati trattati",
          body: [
            <>
              <strong>Dati dell’account:</strong> nome, email, ruolo, credenziali (gestite
              dal provider di autenticazione, password non in chiaro), dati di
              fatturazione dell’abbonamento.
            </>,
            <>
              <strong>Dati inseriti nella piattaforma:</strong> anagrafiche clienti
              dell’officina, lead provenienti da campagne (es. Facebook Lead Ads),
              pratiche di lavorazione, preventivi e documenti.
            </>,
            <>
              <strong>Dati tecnici:</strong> log operativi e di sicurezza necessari al
              funzionamento del servizio.
            </>,
          ],
        },
        {
          heading: "3. Finalità e basi giuridiche",
          body: [
            <>
              Erogazione del servizio e gestione dell’account — esecuzione del contratto.
            </>,
            <>Sicurezza, prevenzione abusi e diagnostica — legittimo interesse.</>,
            <>Adempimenti legali, contabili e fiscali — obbligo di legge.</>,
          ],
        },
        {
          heading: "4. Fornitori e responsabili",
          body: [
            <>
              Per erogare il servizio ci avvaliamo di fornitori che trattano dati per
              nostro conto (responsabili ex art. 28 GDPR), tra cui{" "}
              <strong>Supabase</strong> (database, autenticazione e storage), il provider
              di hosting, <strong>Resend</strong> (email transazionali, ove attivo) e
              <strong> Upstash</strong> (rate limiting, ove attivo). I dati non vengono
              venduti a terzi.
            </>,
          ],
        },
        {
          heading: "5. Trasferimenti extra-UE",
          body: [
            <>
              Alcuni fornitori possono trattare dati al di fuori dello Spazio Economico
              Europeo, sulla base di garanzie adeguate (es. Clausole Contrattuali Standard
              della Commissione Europea).
            </>,
          ],
        },
        {
          heading: "6. Conservazione",
          body: [
            <>
              I dati sono conservati per la durata del rapporto contrattuale. Alla
              cessazione dell’account i dati personali vengono cancellati o anonimizzati,
              salvo obblighi di legge (es. dati fiscali).
            </>,
          ],
        },
        {
          heading: "7. Sicurezza",
          body: [
            <>
              Adottiamo misure tecniche e organizzative adeguate: isolamento dei dati per
              tenant (Row Level Security), accessi basati su ruoli, trasmissione cifrata
              (HTTPS) e protezione delle credenziali.
            </>,
          ],
        },
        {
          heading: "8. Diritti dell’interessato",
          body: [
            <>
              Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e
              opposizione, oltre al diritto di revocare il consenso e di proporre reclamo
              all’Autorità Garante per la protezione dei dati personali (
              <a
                className="text-accent underline"
                href="https://www.garanteprivacy.it"
                target="_blank"
                rel="noopener"
              >
                garanteprivacy.it
              </a>
              ). Per i dati inseriti nella piattaforma dall’officina, le richieste vanno
              indirizzate all’officina titolare; il Fornitore la assiste come
              responsabile. Contatti:{" "}
              <a className="text-accent underline" href={`mailto:${COMPANY.email}`}>
                {COMPANY.email}
              </a>
              .
            </>,
          ],
        },
        {
          heading: "9. Cookie",
          body: [
            <>
              Per l’uso dei cookie consulta la{" "}
              <a className="text-accent underline" href="/cookie">
                Cookie Policy
              </a>
              .
            </>,
          ],
        },
      ]}
    />
  );
}
