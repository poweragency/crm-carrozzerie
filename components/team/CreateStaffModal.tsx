"use client";

import { useEffect, useState } from "react";
import { X, Eye, EyeOff, Copy, Check, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/case/Field";
import {
  EMPLOYEE_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type EmployeeRole,
} from "@/lib/roles";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

function generatePassword(): string {
  // Niente caratteri ambigui (I, l, O, 0, 1) — alta leggibilità per copia manuale.
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function CreateStaffModal({ onClose, onCreated }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EmployeeRole>("preparatore");
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Quando settato, mostra la schermata "credenziali create"
  const [createdCreds, setCreatedCreds] = useState<{
    email: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCreate() {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Compila tutti i campi");
      return;
    }
    if (password.length < 6) {
      setError("Password troppo corta (min. 6 caratteri)");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/team/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? `Errore HTTP ${res.status}`);
      return;
    }

    toast.success("Dipendente creato");
    setCreatedCreds({ email: email.trim(), password });
  }

  function copyCredentials(creds?: { email: string; password: string }) {
    const e = creds?.email ?? email;
    const p = creds?.password ?? password;
    const text = `Email: ${e}\nPassword: ${p}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDone() {
    setCreatedCreds(null);
    onCreated();
  }

  if (createdCreds) {
    return (
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="card w-full max-w-md max-h-[90vh] overflow-auto animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <CheckCircle2
              className="w-5 h-5 text-status-success shrink-0"
              strokeWidth={2.5}
            />
            <h2 className="text-base font-semibold">Dipendente creato</h2>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-text-muted">
              Comunica queste credenziali al dipendente. Potrà accedere subito al CRM.
              Dopo aver chiuso questa finestra <strong>non saranno più visibili</strong> —
              copiale ora.
            </p>

            <div className="bg-bg-input border border-border rounded-md p-3 font-mono text-sm space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase text-text-subtle w-16 shrink-0">
                  Email
                </span>
                <span className="break-all select-all">{createdCreds.email}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase text-text-subtle w-16 shrink-0">
                  Password
                </span>
                <span className="break-all select-all">{createdCreds.password}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => copyCredentials(createdCreds)}
              className="btn-secondary w-full"
            >
              {copied ? (
                <Check className="w-4 h-4 text-status-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copiate negli appunti!" : "Copia credenziali"}
            </button>
          </div>

          <div className="px-5 py-3 border-t border-border flex justify-end">
            <button onClick={handleDone} className="btn-primary" type="button">
              Ho copiato, chiudi
            </button>
          </div>
        </div>
      </div>
    );
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
          <h2 className="text-base font-semibold">Aggiungi dipendente</h2>
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
          <Field label="Nome e cognome *" htmlFor="cs-name">
            <input
              id="cs-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-base"
              placeholder="Mario Rossi"
              autoFocus
            />
          </Field>

          <Field label="Email *" htmlFor="cs-email">
            <input
              id="cs-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="mario@officina.it"
              autoComplete="off"
            />
          </Field>

          <Field label="Mansione *" htmlFor="cs-role" hint={ROLE_DESCRIPTIONS[role]}>
            <select
              id="cs-role"
              value={role}
              onChange={(e) => setRole(e.target.value as EmployeeRole)}
              className="input-base"
            >
              {EMPLOYEE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Password iniziale *"
            htmlFor="cs-password"
            hint="Comunica le credenziali al dipendente. Potrà cambiarle dopo il primo accesso."
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
                id="cs-password"
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
          </Field>

          {error && (
            <div className="text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-md p-2.5">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-between gap-2">
          <button
            type="button"
            onClick={() => copyCredentials()}
            disabled={!email || !password}
            className="btn-ghost disabled:opacity-40 text-xs"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copiate!" : "Copia credenziali"}
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
              {saving ? "Creazione..." : "Crea dipendente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
