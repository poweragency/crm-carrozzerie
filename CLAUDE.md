# CLAUDE.md

Guida per agenti AI che lavorano su questo repo. Linguaggio del progetto: **italiano**
(commenti, messaggi di commit, UI, nomi di dominio). Scrivi codice e commit in italiano.

## Cos'è

**PowerCar** (ex `crm-carrozzerie`/`crm-officina`) — CRM multi-tenant per carrozzerie/officine.
Flusso: lead da Facebook Ads → Kanban → cliente → pratica officina (fasi di lavorazione) →
preventivi/fatture PDF → consegna.
Proprietario: POWER AGENCY. Dominio prod: `powercar.poweragency.it`.

## Stack

Next.js 15 (App Router, Server Components, Server Actions) · React 19 · TypeScript strict ·
Supabase (Auth + Postgres + RLS + Storage + Realtime) · TailwindCSS · Zod · dnd-kit ·
@react-pdf/renderer · sonner · Resend (email, opzionale) · Upstash Redis (rate limit, opzionale).

## Comandi

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # build di produzione
npm run type-check   # tsc --noEmit
npm test             # vitest run (suite unitaria)
npm run lint         # ESLint (config Next)
npm run format       # Prettier write
npm run types        # rigenera types/database.types.ts (richiede supabase CLI)
```

**Ciclo di verifica prima di considerare un blocco completo:**
`npm run type-check && npm test && npm run build`. Per la sicurezza aggiungi
`npm audit --omit=dev` (deve dire `found 0 vulnerabilities`).

## Architettura (big picture)

- **Multi-tenancy via `workshop_id`.** Un workshop = una carrozzeria con **più utenti**
  (1 owner + N dipendenti). `profiles` estende `auth.users` e porta `workshop_id` + `role`.
  La tabella `workshops` è la fonte di verità per i dati del workshop (incluse le
  credenziali Facebook). Le RLS isolano i dati per tenant.
  > Nota: il README descrive ancora il vecchio modello "una carrozzeria = un account
  > (`owner_id`)". È **parzialmente storico** — le tabelle business usano `owner_id` per
  > la RLS, ma sopra c'è il layer team/ruoli con `workshop_id`. In caso di dubbio,
  > **leggi le migrations in `supabase/migrations/`**, non il README.
- **Ruoli** (`lib/roles.ts`): `owner` + dipendenti `preparatore`/`verniciatore`/`finitore`.
  Ogni mansione vede solo la propria fase di lavorazione della pratica
  (`preparazione → verniciatura → finitura → controllo_titolare → completata`).
  Lo specchio lato DB sono le funzioni `role_phase()`/`next_phase()`.
- **Webhook Facebook Lead Ads** (`app/api/webhooks/facebook/`): riceve i lead, identifica
  il tenant via `fb_page_id`, scrive con `service_role`. Verifica firma HMAC obbligatoria
  (fail-closed). NON è una Edge Function: è una route Next.js (runtime Node).
- **Route admin/team** (`/api/admin/*`, `/api/team/*`): usano `service_role` per cambiare
  ruolo/mansione. Gate con `requireOwner()` (`lib/owner.ts`).
- **Validazione env all'avvio**: `instrumentation.ts` fa fail-fast sulle var obbligatorie
  e logga warning su quelle opzionali mancanti.

## Lead Ads — produzione & decisioni (giu 2026)

- **App Meta dedicata: PowerCar** (App ID `2018849399007901`), **pubblicata (Live)**, owner
  Poweragency. Regola portfolio: **una app FB per prodotto verticale** (non per cliente).
- **Webhook**: `https://powercar.poweragency.it/api/webhooks/facebook` (oggetto Page, campo
  `leadgen`), firma HMAC con `FB_APP_SECRET`. Il `verify_token` del GET è confrontato con
  `workshops.fb_verify_token` (per-workshop).
- **Niente App Review, niente Facebook Login.** Le pagine dei clienti si portano nel
  **Business Manager Poweragency** (diventano *business asset*) → l'app le legge in **Standard
  Access**. Il backend usa un **System User "PowerCar Backend"** (BM) per generare i **page
  token** per-workshop. Il SU token sta nel **password manager** (NON nel `.env`); nel
  workshop ci va solo il page token (`workshops.fb_page_access_token`, write-only).
- **Pubblicare l'app è obbligatorio**: in dev mode Meta consegna solo i webhook di prova della
  dashboard, non i lead reali. (È stato il blocco del "Pending" nel Testing Tool.)
- **Onboarding di un cliente nuovo** → procedura ripetibile in
  **[ONBOARDING-CLIENTE.md](ONBOARDING-CLIENTE.md)**.

## File chiave

- `lib/supabase/{server,client,admin,middleware}.ts` — i 3 client (SSR cookie-based,
  browser, service_role) + middleware auth.
- `lib/owner.ts` / `lib/roles.ts` — gate owner-only e logica ruoli↔fasi.
- `lib/rate-limit.ts` — `rateLimitDistributed()` (Upstash + fallback in-memory).
- `lib/schemas/index.ts` — schemi Zod per la validazione dei form.
- `lib/constants.ts` / `lib/notify-messages.ts` — label/colori status, template email.
- `middleware.ts` — auth middleware default-deny (redirect a `/login`).
- `types/database.types.ts` — tipi generati da Supabase (non editare a mano).

## Convenzioni

- **Validazione**: ogni input form passa da uno schema Zod prima del salvataggio.
- **RLS first**: la sicurezza dei dati vive nel DB (RLS + trigger), non solo nel client.
  Non aggirare la RLS lato client; per operazioni privilegiate usa le route `service_role`.
- **Migrations**: vivono in `supabase/migrations/` (le applica `supabase db push`).
  `supabase/migrations-pending/` è uno staging che il CLI **non** applica — sposta il file
  in `migrations/` quando è pronto. Scrivi migrations idempotenti.
- **`owner_id` automatico**: il trigger `set_owner_id()` lo valorizza sugli INSERT; il
  frontend non lo passa.

## Sicurezza — invarianti da NON regredire

Tracciate in [TODO-SICUREZZA.md](TODO-SICUREZZA.md). In sintesi, non rompere:

- Webhook FB: verifica firma HMAC obbligatoria (fail-closed se manca `FB_APP_SECRET`).
- Privilege escalation chiusa: trigger `trg_guard_profile_cols` impedisce all'utente di
  auto-modificare `role`/`workshop_id` (solo `service_role` può).
- Token Facebook (`fb_page_access_token`/`fb_verify_token`) **non leggibili** dai dipendenti:
  SELECT di colonna ristretta su `workshops`, campo write-only nel form Impostazioni, il
  verify_token si legge solo via RPC owner-only `get_workshop_fb_secrets()`.
- Rate limiting distribuito via `rateLimitDistributed()`.
- Niente leak di `error.message` grezzi sulle route 500 pubbliche.

## Gotchas

- **Windows + drive di rete `Z:` (UNC).** Gli hook husky fallirebbero su path UNC.
  `postinstall` imposta `DisableUNCCheck=1` nel registro (per-utente, idempotente).
  Se serve: `npm run setup:dev`.
- **`xlsx`** è installato dalla CDN ufficiale SheetJS (non da npm) — è voluto, chiude
  prototype pollution/ReDoS. Dopo un `git pull` serve `npm install`.
- **Vulnerabilità dev-only** (esbuild→vite→vitest): non finiscono in produzione
  (`npm audit --omit=dev` → 0). Non fare `audit fix --force` (proporrebbe vitest@4 breaking).
- **CSP** attuale usa `unsafe-inline`/`unsafe-eval` (difesa in profondità rimandata, vedi TODO).

## Regole di lavoro

Prima di proporre, **leggi il codice/schema reali** (le migrations sono la verità sul DB).
Per modifiche non banali proponi il piano e attendi conferma. Commit in italiano. Prima di
`git push` chiedi se fare un test locale o pushare subito (salvo preferenza già espressa).
