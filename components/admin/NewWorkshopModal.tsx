"use client";

import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { Workshop } from "./WorkshopTable";

interface Props {
  onClose: () => void;
  onCreated: (w: Workshop) => void;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function NewWorkshopModal({ onClose, onCreated }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [workshopName, setWorkshopName] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    if (!email.trim() || !password || !workshopName.trim()) {
      setError("Compila tutti i campi");
      return;
    }
    if (password.length < 6) {
      setError("Password troppo corta (min. 6 caratteri)");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        workshop_name: workshopName.trim(),
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? `Errore HTTP ${res.status}`);
      return;
    }

    const { id } = (await res.json()) as { id: string; email: string };

    // Costruiamo un Workshop minimo da mostrare in tabella subito.
    const newW: Workshop = {
      id,
      email: email.trim(),
      workshop_name: workshopName.trim(),
      phone: null,
      vat_number: null,
      tax_code: null,
      address: null,
      city: null,
      postal_code: null,
      province: null,
      facebook_connected: false,
      registered_at: new Date().toISOString(),
      last_sign_in_at: null,
      banned_until: null,
      email_confirmed: true,
      leads_count: 0,
      cases_count: 0,
      cases_open_count: 0,
      revenue_total: 0,
      invoices_count: 0,
      documents_count: 0,
    };

    toast.success("Officina creata", {
      description: `Credenziali: ${email} / ${password}`,
      duration: 15000,
    });
    onCreated(newW);
  }

  function copyCredentials() {
    const text = `URL: https://crm-carrozzerie.vercel.app/login\nEmail: ${email}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    toast.success("Credenziali copiate negli appunti");
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md max-h-[90vh] overflow-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">Nuova officina</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text"
            type="button"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Nome carrozzeria *
            </label>
            <input
              type="text"
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              className="input-base"
              placeholder="Carrozzeria Rossi"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="info@carrozzeriarossi.it"
              autoComplete="off"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-text-muted">
                Password iniziale *
              </label>
              <button
                onClick={() => setPassword(generatePassword())}
                type="button"
                className="text-[11px] text-accent hover:underline"
              >
                Genera nuova
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base pr-10 font-mono"
                autoComplete="off"
              />
              <button
                onClick={() => setShowPassword((v) => !v)}
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text"
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-text-subtle mt-1.5">
              L&apos;account sarà attivo subito (email pre-confermata).
              Comunica tu le credenziali all&apos;officina.
            </p>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-between gap-2">
          <button
            onClick={copyCredentials}
            disabled={!email || !password}
            className="btn-ghost disabled:opacity-40"
            type="button"
          >
            Copia credenziali
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary" type="button">
              Annulla
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="btn-primary"
              type="button"
            >
              {saving ? "Creazione..." : "Crea officina"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
