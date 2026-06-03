# 🔒 TODO Sicurezza

Cose **ancora da fare** emerse dall'audit di sicurezza. I fix già applicati sono
nel commit `e6c67ff` (`fix(sicurezza): hardening da audit ...`).

> Legenda priorità: 🔴 da fare subito · 🟡 a breve · 🟢 quando capita
> Aggiorna la casella `[ ]` → `[x]` quando completi un punto.

---

## 1. 🔴 Configurare le env var in PRODUZIONE (Vercel)

I fix sono nel codice, ma **alcuni si attivano solo se le variabili sono impostate**
nell'ambiente di produzione. Senza queste, il comportamento è più debole (o, per il
webhook, bloccato di proposito).

- [ ] **`FB_APP_SECRET`** — App Secret di Meta. **Obbligatoria.**
  Da quando è attivo il fix #2, il webhook Facebook **rifiuta tutte le richieste**
  (HTTP 500) se questa var non è impostata. Senza, i lead da Facebook NON entrano.
  → Meta for Developers → la tua App → Impostazioni → Di base → "Chiave segreta".

- [ ] **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`** — rate limiting distribuito.
  Senza, il rate limit resta in-memory per-istanza (fallback automatico, non si rompe
  nulla, ma su Vercel serverless è poco efficace).
  → Crea un DB gratuito su <https://console.upstash.com/> → copia URL e token REST.

- [ ] Verificare che siano già impostate (e corrette): `SUPABASE_SERVICE_ROLE_KEY`,
  `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

> ℹ️ All'avvio il server logga un warning con l'elenco delle var opzionali mancanti
> (vedi `instrumentation.ts`). Controlla i log di deploy dopo il prossimo rilascio.

---

## 2. 🔴 Aggiornamento `xlsx` sui PC dei collaboratori

Il fix #1 ha spostato `xlsx` alla build ufficiale SheetJS (chiude prototype
pollution + ReDoS). È già in `package.json`/`package-lock.json`, ma chi ha già il
repo in locale deve **reinstallare** per allinearsi:

- [ ] Ogni collaboratore, dopo `git pull`, lancia:
  ```bash
  npm install
  ```
  (scaricherà `xlsx` dalla CDN SheetJS — è normale, è il metodo raccomandato dagli autori).
- [ ] In caso di problemi di rete con la CDN, il comando esplicito è:
  ```bash
  npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
  ```

---

## 3. 🟡 CSP nonce-based (fix #5 dell'audit — rimandato)

**Stato:** non fatto, di proposito. Gravità **BASSA**.

La Content-Security-Policy attuale (`next.config.ts`) usa
`script-src 'self' 'unsafe-inline' 'unsafe-eval'`. `unsafe-inline`/`unsafe-eval`
indeboliscono la protezione XSS. Oggi **non c'è XSS attiva** (nessun
`dangerouslySetInnerHTML`, React fa escaping di default), quindi è solo difesa in
profondità.

Non è stato fatto subito perché una CSP nonce-based con Next App Router ha **alto
rischio di rompere l'hydration**: va testata con cura.

- [ ] Implementare CSP con nonce (nonce generato nel middleware e propagato agli
  script Next), rimuovendo `unsafe-inline` da `script-src`.
- [ ] Testare a fondo: hydration, font Inter, `@react-pdf/renderer`, upload immagini.
- [ ] `'unsafe-eval'` potrebbe restare necessario per alcune librerie: verificare prima di rimuoverlo.

---

## 4. 🟢 Vulnerabilità dev-only (`npm audit`)

`npm audit` segnala alcune vuln nella catena **esbuild → vite → vitest** (il runner
dei test). **NON finiscono in produzione** (`npm audit --omit=dev` → 0 vulnerabilità),
quindi non sono urgenti. Riguardano solo il dev server locale.

- [ ] Quando esce una major stabile compatibile, aggiornare `vitest`
  (oggi `audit fix --force` proporrebbe `vitest@4` — breaking, da NON fare ora).
- [ ] Ricontrollare a ogni bump di `next` se `postcss` può tornare senza `overrides`.

---

## 5. 🟢 Migliorie opzionali (difesa in profondità)

Non sono vulnerabilità sfruttabili oggi, ma alzano l'asticella.

- [ ] **Token FB nel form Settings** (`components/SettingsForm.tsx`): il
  `fb_page_access_token` viene caricato e re-inviato dal client. È protetto da RLS
  (solo l'owner del proprio workshop lo vede), ma valutare un campo "write-only"
  (mostra `••••`, invia solo se modificato) per non esporlo nel traffico/DevTools.
- [ ] **Token nell'URL Graph API** (`app/api/webhooks/facebook/route.ts`): l'
  `access_token` è in query string; in caso di errore loggato potrebbe finire nei
  log server. Valutare di non loggare il body grezzo della risposta Graph.
- [ ] **Sanitizzazione errori nelle route admin/team**: le route `/api/admin/*` e
  `/api/team/*` rimandano ancora alcuni `error.message` di Supabase. Sono gated
  (admin/owner) e i messaggi sono per lo più UX utili, ma valutare di genericizzare
  i path 500 (errori DB).

---

## Come verificare lo stato di sicurezza in qualsiasi momento

```bash
npm run type-check          # tipi OK
npm test                    # 47 test
npm run build               # build di produzione
npm audit --omit=dev        # deve dire: found 0 vulnerabilities
```

## Cosa è GIÀ stato sistemato (NON regredire)

- ✅ Webhook FB: verifica firma HMAC **obbligatoria** (fail-closed).
- ✅ Rate limiting: `rateLimitDistributed()` (Upstash + fallback in-memory).
- ✅ `postcss` patchato (override a 8.5.x).
- ✅ `xlsx` su build CDN SheetJS 0.20.3.
- ✅ Validazione env all'avvio (`instrumentation.ts`).
- ✅ Stop leak errori grezzi su `/api/invoices` e `/api/notifications/case-status`.

> Già solido prima dell'audit (da non rompere): RLS su tutte le tabelle, isolamento
> multi-tenant via `workshop_id`, middleware default-deny, `getUser()` server-side,
> cookie httpOnly, storage privato con limiti MIME/dimensione, query parametrizzate.
