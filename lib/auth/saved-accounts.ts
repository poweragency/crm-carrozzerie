// ============================================================
// Saved accounts (Instagram-style) - sicurezza
// ----------------------------------------------------------------
// Per ogni account "salvato" su questo dispositivo memorizziamo i dati di
// switch in un UNICO cookie HttpOnly. Implicazione: il refresh token NON è
// leggibile da JavaScript, quindi un eventuale XSS non lo può rubare.
// Le API server-side (/api/auth/*) sono l'unico modo per leggerli, e per
// passare al cookie nuovo serve l'header `Origin` corrispondente al dominio
// (SameSite=lax → niente cross-site CSRF su POST).
// ============================================================

import { cookies } from "next/headers";

export const SAVED_ACCOUNTS_COOKIE = "crm-saved-accounts";
const MAX_SAVED = 8;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 anno

export interface SavedAccount {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  refresh_token: string;
  saved_at: string;
}

// Versione "pubblica" senza il refresh token, che possiamo passare al client.
export type SavedAccountPublic = Omit<SavedAccount, "refresh_token">;

function safeParse(raw: string | undefined): SavedAccount[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is SavedAccount =>
        a != null &&
        typeof a.id === "string" &&
        typeof a.email === "string" &&
        typeof a.refresh_token === "string"
    );
  } catch {
    return [];
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

/**
 * Legge il cookie e ritorna gli account salvati su questo dispositivo.
 * Da usare in route handler / server component / server action.
 */
export async function readSavedAccounts(): Promise<SavedAccount[]> {
  const store = await cookies();
  return safeParse(store.get(SAVED_ACCOUNTS_COOKIE)?.value);
}

/** Versione pubblica (senza refresh_token) per i client component. */
export async function readSavedAccountsPublic(): Promise<SavedAccountPublic[]> {
  const all = await readSavedAccounts();
  return all.map(({ refresh_token: _rt, ...rest }) => rest);
}

/** Scrive l'array nel cookie. */
export async function writeSavedAccounts(accounts: SavedAccount[]): Promise<void> {
  const store = await cookies();
  if (accounts.length === 0) {
    store.delete(SAVED_ACCOUNTS_COOKIE);
    return;
  }
  store.set(SAVED_ACCOUNTS_COOKIE, JSON.stringify(accounts), cookieOptions());
}

/** Aggiunge un account (o aggiorna il refresh token se esiste già). */
export async function upsertSavedAccount(account: SavedAccount): Promise<void> {
  const all = await readSavedAccounts();
  const idx = all.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    all[idx] = account;
  } else {
    all.unshift(account);
  }
  await writeSavedAccounts(all.slice(0, MAX_SAVED));
}

/** Rimuove l'account dato. */
export async function removeSavedAccount(id: string): Promise<void> {
  const all = await readSavedAccounts();
  await writeSavedAccounts(all.filter((a) => a.id !== id));
}

/** Trova l'account salvato per id (compreso refresh_token). */
export async function getSavedAccount(id: string): Promise<SavedAccount | null> {
  const all = await readSavedAccounts();
  return all.find((a) => a.id === id) ?? null;
}
