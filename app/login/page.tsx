import { Wrench } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SavedAccountsList } from "@/components/auth/SavedAccountsList";
import { readSavedAccountsPublic } from "@/lib/auth/saved-accounts";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const savedAccounts = await readSavedAccountsPublic();

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

          <SavedAccountsList accounts={savedAccounts} />

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
