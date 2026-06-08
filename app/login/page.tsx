import { Wrench } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SavedAccountsList } from "@/components/auth/SavedAccountsList";
import { readSavedAccountsPublic } from "@/lib/auth/saved-accounts";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ switch?: string }>;
}

const SWITCH_ERRORS: Record<string, string> = {
  expired:
    "Il login rapido e' scaduto. Inserisci email e password (poi puoi salvare di nuovo l'account).",
  not_saved: "Account non piu' salvato su questo dispositivo.",
  error: "Errore temporaneo nel passaggio account. Riprova.",
  invalid: "Risposta non valida dal server di autenticazione.",
};

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const savedAccounts = await readSavedAccountsPublic();
  const switchError = sp.switch ? SWITCH_ERRORS[sp.switch] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">CRM Officina</h1>
            <p className="text-xs text-text-subtle">Gestione lead & pratiche</p>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-1">Accedi</h2>
          <p className="text-sm text-text-muted mb-6">
            {savedAccounts.length > 0
              ? "Scegli un account o inserisci le credenziali."
              : "Inserisci le tue credenziali."}
          </p>

          {switchError && (
            <div className="mb-4 text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-md p-2.5">
              {switchError}
            </div>
          )}

          <SavedAccountsList accounts={savedAccounts} />

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-text-subtle">
          <a href="/privacy" className="hover:text-text">
            Privacy
          </a>
          {" · "}
          <a href="/cookie" className="hover:text-text">
            Cookie
          </a>
          {" · "}
          <a href="/termini" className="hover:text-text">
            Termini
          </a>
        </p>
      </div>
    </div>
  );
}
