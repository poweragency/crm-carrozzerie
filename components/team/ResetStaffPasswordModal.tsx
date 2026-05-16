"use client";

import { useState } from "react";
import { X, Eye, EyeOff, Copy, Check, KeyRound } from "lucide-react";
import { Field } from "@/components/case/Field";

interface Props {
  staffId: string;
  staffName: string;
  staffEmail: string;
  onClose: () => void;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function ResetStaffPasswordModal({
  staffId,
  staffName,
  staffEmail,
  onClose,
}: Props) {
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    setError(null);
    if (password.length < 6) {
      setError("Password troppo corta (min. 6 caratteri)");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/team/users/${staffId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? `Errore HTTP ${res.status}`);
      return;
    }
    setDone(true);
  }

  function copyCredentials() {
    const text = `Email: ${staffEmail}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <KeyRound className="w-5 h-5 text-accent shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold">
              {done ? "Password aggiornata" : "Resetta password"}
            </h2>
            <p className="text-[11px] text-text-subtle truncate">
              {staffName} · {staffEmail}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-text-muted hover:text-text"
            type="button"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <>
              <p className="text-sm text-text-muted">
                Nuove credenziali. Dopo aver chiuso non saranno più visibili — copiale
                ora.
              </p>
              <div className="bg-bg-input border border-border rounded-md p-3 font-mono text-sm space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] uppercase text-text-subtle w-16 shrink-0">
                    Email
                  </span>
                  <span className="break-all select-all">{staffEmail}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] uppercase text-text-subtle w-16 shrink-0">
                    Password
                  </span>
                  <span className="break-all select-all">{password}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={copyCredentials}
                className="btn-secondary w-full"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-status-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copiate!" : "Copia credenziali"}
              </button>
            </>
          ) : (
            <Field
              label="Nuova password *"
              htmlFor="rs-pw"
              hint="La vecchia password verrà invalidata. Comunica la nuova al dipendente."
            >
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  className="text-[11px] text-accent hover:underline ml-auto"
                >
                  Genera nuova
                </button>
              </div>
              <div className="relative">
                <input
                  id="rs-pw"
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
                  aria-label={showPassword ? "Nascondi" : "Mostra"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </Field>
          )}

          {error && (
            <div className="text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-md p-2.5">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          {done ? (
            <button onClick={onClose} className="btn-primary" type="button">
              Ho copiato, chiudi
            </button>
          ) : (
            <>
              <button onClick={onClose} className="btn-secondary" type="button">
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
                type="button"
              >
                {saving ? "Aggiornamento..." : "Resetta password"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
