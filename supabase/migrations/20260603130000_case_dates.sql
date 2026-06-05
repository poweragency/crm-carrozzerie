-- ============================================================
-- Date pratica: data inizio (started_at) e data scadenza (due_at).
--   - started_at: data di inizio lavorazione (default oggi, modificabile)
--   - due_at: data prevista consegna/scadenza (obbligatoria, scelta dall'utente)
-- Vengono entrambe richieste alla creazione (sia da NewCaseModal sia da
-- conversione lead→cliente). Le righe esistenti vengono backfillate.
-- ============================================================

alter table public.cases
  add column if not exists started_at date not null default current_date,
  add column if not exists due_at date;

-- Backfill: pratiche esistenti senza scadenza → +30g dall'inizio.
update public.cases
set due_at = started_at + interval '30 days'
where due_at is null;

alter table public.cases
  alter column due_at set not null;

-- Default a +30 giorni dall'oggi: serve al trigger handle_lead_to_customer che
-- crea la pratica con un INSERT minimale. La convert RPC e i form la sovrascrivono
-- con il valore scelto dall'utente.
alter table public.cases
  alter column due_at set default (current_date + interval '30 days')::date;

create index if not exists cases_due_at_idx on public.cases(due_at);
