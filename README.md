# PowerCar

CRM multi-tenant per officine/carrozzerie. Gestione lead da Facebook Ads → Kanban → cliente → pratica officina → preventivi/fatture → consegna.

> 🔒 **Sicurezza:** i punti aperti e le cose da configurare (env var di produzione,
> reinstall dipendenze, migliorie) sono tracciati in **[TODO-SICUREZZA.md](TODO-SICUREZZA.md)**.
> Leggilo prima di mettere in produzione o se sei un nuovo collaboratore.

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **React 19** + **TypeScript** (strict)
- **TailwindCSS** (dark theme, accent arancione)
- **Supabase** (Auth + Postgres + RLS + Storage + Realtime)
- **dnd-kit** (Kanban drag & drop)
- **Zod** (validazione form)
- **sonner** (toast notifications)
- **@react-pdf/renderer** (PDF preventivi/fatture)
- **date-fns** (calendario)
- **Resend** (notifiche email cliente — opzionale)

## Modello multi-tenant

**Una carrozzeria = un account utente.** Ogni tabella business ha `owner_id` collegato a `auth.users(id)`. Le RLS policies isolano i dati: un utente vede ed edita solo i propri lead, customers, vehicles, cases, documents, notes, appointments, invoices e invoice_items. Il trigger `set_owner_id()` valorizza `owner_id = auth.uid()` automaticamente su tutti gli INSERT, quindi il frontend non deve passarlo esplicitamente.

## Setup

### 1. Installa le dipendenze

```bash
npm install
```

> **Windows + drive di rete (es. `Z:` mappato su `\\Pa-server\...`).**
> `cmd.exe` non supporta i percorsi UNC come directory corrente, quindi gli hook
> git/husky fallirebbero con _"Current directory is not a git directory!"_.
> Lo script `postinstall` imposta automaticamente la chiave di registro
> `HKCU\Software\Microsoft\Command Processor\DisableUNCCheck = 1` (per-utente,
> nessun admin, reversibile) che risolve il problema alla radice.
> Se serve rilanciarlo a mano: `npm run setup:dev`. È idempotente e su sistemi
> non-Windows non fa nulla.

### 2. Variabili d'ambiente

Copia `.env.example` in `.env.local` e compila:

| Variabile | Dove la trovi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon`/`publishable` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` (**server only**) |
| `FB_APP_SECRET` | Meta App → Settings → Basic → App Secret — **obbligatoria**: senza, il webhook FB rifiuta le richieste (fail-closed) |
| `RESEND_API_KEY` | resend.com → API Keys (opzionale, per inviare email reali) |
| `RESEND_FROM_EMAIL` | Mittente verificato Resend (es. `Officina <noreply@dominio.it>`) |
| `UPSTASH_REDIS_REST_URL` | console.upstash.com → DB → REST (opzionale: rate limiting distribuito; senza, fallback in-memory) |
| `UPSTASH_REDIS_REST_TOKEN` | console.upstash.com → DB → REST token (opzionale, vedi sopra) |

> Dettagli su quali env var attivare in produzione: vedi **[TODO-SICUREZZA.md](TODO-SICUREZZA.md)**.

### 3. Database

Le migrations vivono in [supabase/migrations/](supabase/migrations/). Il progetto Supabase di riferimento è già configurato, ma per un nuovo ambiente:

```bash
supabase link --project-ref <project-id>
supabase db push
```

### 4. Crea il primo utente

Supabase Auth è invite-only di default. Crea l'utente admin manualmente:

1. Supabase Dashboard → **Authentication → Users → Add user**
2. Inserisci email + password, spunta "Auto Confirm User"
3. Il trigger `handle_new_user` crea automaticamente il profilo con `workshop_name = "La mia carrozzeria"`

### 5. Avvia

```bash
npm run dev
```

Apri http://localhost:3000 e accedi.

---

## Struttura del progetto

```
.
├── app/
│   ├── (app)/                     # Route protette (auth required)
│   │   ├── layout.tsx             # Sidebar + auth guard
│   │   ├── dashboard/             # KPI + ultimi lead/pratiche
│   │   ├── leads/                 # Kanban dnd-kit + realtime delta update
│   │   ├── cases/
│   │   │   ├── page.tsx           # Lista pratiche (search/filter)
│   │   │   └── [id]/              # Dettaglio (panels) + photo gallery + invoices
│   │   ├── invoices/[id]/         # Editor preventivo/fattura + export PDF
│   │   ├── calendar/              # Vista mese appuntamenti
│   │   └── settings/              # Account + dati fiscali + Facebook
│   ├── api/
│   │   ├── webhooks/facebook/     # Webhook FB Lead Ads
│   │   ├── invoices/              # POST: crea bozza preventivo/fattura
│   │   └── notifications/case-status/ # POST: notifica cliente via email
│   ├── auth/signout/
│   ├── login/
│   └── signup/
├── components/
│   ├── case/                      # Panels della pratica (Customer, Vehicle, Case, Documents, Photo, Notes, Invoices, Notify)
│   ├── calendar/                  # CalendarView grid + AppointmentModal
│   ├── invoice/                   # InvoicePDF + InvoiceEditor
│   ├── CaseDetail.tsx             # Container che orchestra i panel + save unico
│   ├── CasesTable.tsx
│   ├── KanbanBoard.tsx
│   ├── LeadCard.tsx · LeadModal.tsx
│   ├── SettingsForm.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── supabase/                  # client.ts, server.ts, admin.ts, middleware.ts
│   ├── schemas/                   # Schemi Zod per validazione form
│   ├── constants.ts               # Label/colori status
│   └── utils.ts
├── supabase/
│   └── migrations/                # Schema + RLS + triggers + storage buckets
├── types/
│   └── database.types.ts          # Tipi generati da Supabase
└── middleware.ts                  # Auth middleware (redirect /login)
```

---

## Database schema

| Tabella | Scopo |
|---|---|
| `profiles` | Estende `auth.users`. Dati anagrafici officina + dati fiscali (P.IVA, IBAN, prefisso fatture) + credenziali Facebook |
| `leads` | Lead in arrivo (FB Ads o manuali). Status: `nuovo · contattato · preventivo · cliente · perso` |
| `customers` | Creati automaticamente quando lead passa a `cliente` (trigger) |
| `vehicles` | Veicoli del cliente (uno-a-molti per cliente). Make/Model/Plate/VIN/Year/Color |
| `cases` | Pratiche officina. Status: `preparazione · verniciatura · finitura · completata · consegnata`. FK opzionale a `vehicles` |
| `documents` | Foto danni e PDF caricati. Storage bucket `documents` (privato, 10MB) |
| `notes` | Note testuali su lead OR case (vincolo XOR) |
| `appointments` | Calendario. Kind: `accettazione · consegna · sopralluogo · lavorazione · altro` |
| `invoices` | Preventivi e fatture. Numerazione `{PREFIX}-{YEAR}-{seq}` |
| `invoice_items` | Righe del preventivo/fattura. Totali ricalcolati via trigger |

**Trigger automatici:**

- `handle_lead_to_customer` — lead → `cliente` crea customer + case in cascata
- `handle_new_user` — alla registrazione crea profile con workshop_name dai metadata
- `set_owner_id` — su ogni INSERT setta `owner_id = auth.uid()` se nullo
- `set_updated_at` — refresh automatico di `updated_at`
- `recalc_invoice_totals` — al cambio degli items ricalcola subtotal, IVA, totale

**RLS multi-tenant:** ogni policy filtra per `owner_id = auth.uid()`. Storage policies filtrano per `{user_id}/...` come primo segmento del path.

---

## Feature principali

### Lead Kanban con realtime delta update

La pagina `/leads` mostra i lead in colonne `nuovo → contattato → preventivo → cliente → perso`. Drag & drop tra colonne aggiorna lo status. La subscription Realtime applica delta update (INSERT/UPDATE/DELETE) senza fare full refetch.

Quando un lead passa a `cliente`, il trigger `handle_lead_to_customer` crea automaticamente customer + case in stato `preventivo`.

### Pratica officina (CaseDetail)

Pagina `/cases/[id]` divisa in panel:

- **Cliente** — full_name, phone, email
- **Veicolo** — dropdown se il cliente ha più veicoli, altrimenti form per crearne uno nuovo
- **Pratica** — assicurazione, prezzo, descrizione lavori, stato
- **Foto danni** — gallery thumbnail + lightbox keyboard-navigable (← → Esc)
- **Altri documenti** — PDF e file non-immagine
- **Preventivi e fatture** — lista con stato, link all'editor
- **Note** — annotazioni interne
- **Notifica cliente** — pulsante per inviare email con stato corrente

Tutti i campi sono validati con Zod prima del salvataggio.

### Preventivi e fatture PDF

Da `/cases/[id]` click su "Preventivo" o "Fattura" → editor `/invoices/[id]` con righe quantità × prezzo, IVA configurabile, ricalcolo automatico. Bottone "Scarica PDF" genera il documento con `@react-pdf/renderer` includendo intestazione officina (workshop_name, P.IVA, indirizzo, IBAN) e dati cliente/veicolo.

Numerazione automatica: `{INVOICE_PREFIX}-{YEAR}-{seq}` (es. `PREV-2026-001`).

### Calendario appuntamenti

`/calendar` mostra vista mese con gli appuntamenti del periodo. Click su una cella → crea nuovo appuntamento. Click su un appuntamento → modifica/elimina. Categorie: accettazione, consegna, sopralluogo, lavorazione, altro (con codice colore).

### Notifiche email

Bottone "Notifica cliente" nella pratica invia un'email con il messaggio del template per lo stato corrente. Richiede `RESEND_API_KEY` + `RESEND_FROM_EMAIL`; se non configurate, mostra un preview senza inviare.

---

## Configurazione Facebook Lead Ads

Vedi la guida passo-passo nella sezione **Impostazioni → Collegamento Facebook Ads** (apre una guida espandibile in 5 step). In breve:

1. Trova l'ID Pagina FB
2. Genera un Page Access Token (permessi `leads_retrieval`, `pages_manage_metadata`)
3. Incolla i 2 valori nelle Impostazioni del CRM
4. Su Meta for Developers (app **PowerCar**) → Webhooks → URL `https://powercar.poweragency.it/api/webhooks/facebook`, Verify Token = `workshops.fb_verify_token` (lo trovi nelle Impostazioni)
5. Subscribe `leadgen`

Il webhook usa `service_role` per scrivere e identifica il tenant via `fb_page_id` su `workshops`.

---

## Comandi utili

```bash
npm run dev          # avvio in dev
npm run build        # build production
npm run start        # avvia build production
npm run lint         # ESLint (config Next default)
npm run type-check   # tsc --noEmit
npm run format       # Prettier write
npm run types        # rigenera types/database.types.ts (richiede supabase CLI)
```

---

## Deploy

### Vercel (consigliato)

1. Push del repo su GitHub
2. Importa su Vercel
3. Aggiungi le env vars
4. Deploy

Il webhook Facebook richiede HTTPS pubblico — Vercel lo fornisce automaticamente.

---

## License

Proprietary — POWER AGENCY
