-- ============================================================
-- Step 2/5 — Migrazione owner_id → workshop_id su tabelle business
--
-- Approccio conservativo: mantiene owner_id in parallelo come safety net.
-- Lo Step 3 dropperà owner_id quando il codice TS sarà migrato.
--
-- Per ogni tabella business:
--   1. workshop_id (FK → workshops, CASCADE)
--   2. Backfill via JOIN profiles
--   3. NOT NULL
--   4. Index
--   5. RLS policy workshop_id-based IN AGGIUNTA (OR) alle owner_id esistenti
--
-- Trigger set_owner_id esteso per popolare anche workshop_id.
-- notify_new_lead aggiornato per includere workshop_id.
-- ============================================================

-- 1) Aggiungi colonne workshop_id (nullable inizialmente)
alter table public.leads add column if not exists workshop_id uuid;
alter table public.customers add column if not exists workshop_id uuid;
alter table public.cases add column if not exists workshop_id uuid;
alter table public.documents add column if not exists workshop_id uuid;
alter table public.notes add column if not exists workshop_id uuid;
alter table public.vehicles add column if not exists workshop_id uuid;
alter table public.appointments add column if not exists workshop_id uuid;
alter table public.invoices add column if not exists workshop_id uuid;
alter table public.invoice_items add column if not exists workshop_id uuid;
alter table public.notifications add column if not exists workshop_id uuid;

-- 2) Backfill via lookup profiles.workshop_id
update public.leads l
  set workshop_id = p.workshop_id
  from public.profiles p
  where p.id = l.owner_id and l.workshop_id is null;

update public.customers c
  set workshop_id = p.workshop_id
  from public.profiles p
  where p.id = c.owner_id and c.workshop_id is null;

update public.cases ca
  set workshop_id = p.workshop_id
  from public.profiles p
  where p.id = ca.owner_id and ca.workshop_id is null;

update public.documents d
  set workshop_id = p.workshop_id
  from public.profiles p
  where p.id = d.owner_id and d.workshop_id is null;

update public.notes n
  set workshop_id = p.workshop_id
  from public.profiles p
  where p.id = n.owner_id and n.workshop_id is null;

update public.vehicles v
  set workshop_id = p.workshop_id
  from public.profiles p
  where p.id = v.owner_id and v.workshop_id is null;

update public.appointments a
  set workshop_id = p.workshop_id
  from public.profiles p
  where p.id = a.owner_id and a.workshop_id is null;

update public.invoices i
  set workshop_id = p.workshop_id
  from public.profiles p
  where p.id = i.owner_id and i.workshop_id is null;

update public.invoice_items ii
  set workshop_id = p.workshop_id
  from public.profiles p
  where p.id = ii.owner_id and ii.workshop_id is null;

update public.notifications nn
  set workshop_id = p.workshop_id
  from public.profiles p
  where p.id = nn.owner_id and nn.workshop_id is null;

-- 3) FK + indici (FK CASCADE: drop workshop → tutto pulito)
alter table public.leads
  drop constraint if exists leads_workshop_fk,
  add constraint leads_workshop_fk foreign key (workshop_id)
    references public.workshops(id) on delete cascade;
create index if not exists leads_workshop_idx on public.leads(workshop_id);

alter table public.customers
  drop constraint if exists customers_workshop_fk,
  add constraint customers_workshop_fk foreign key (workshop_id)
    references public.workshops(id) on delete cascade;
create index if not exists customers_workshop_idx on public.customers(workshop_id);

alter table public.cases
  drop constraint if exists cases_workshop_fk,
  add constraint cases_workshop_fk foreign key (workshop_id)
    references public.workshops(id) on delete cascade;
create index if not exists cases_workshop_idx on public.cases(workshop_id);

alter table public.documents
  drop constraint if exists documents_workshop_fk,
  add constraint documents_workshop_fk foreign key (workshop_id)
    references public.workshops(id) on delete cascade;
create index if not exists documents_workshop_idx on public.documents(workshop_id);

alter table public.notes
  drop constraint if exists notes_workshop_fk,
  add constraint notes_workshop_fk foreign key (workshop_id)
    references public.workshops(id) on delete cascade;
create index if not exists notes_workshop_idx on public.notes(workshop_id);

alter table public.vehicles
  drop constraint if exists vehicles_workshop_fk,
  add constraint vehicles_workshop_fk foreign key (workshop_id)
    references public.workshops(id) on delete cascade;
create index if not exists vehicles_workshop_idx on public.vehicles(workshop_id);

alter table public.appointments
  drop constraint if exists appointments_workshop_fk,
  add constraint appointments_workshop_fk foreign key (workshop_id)
    references public.workshops(id) on delete cascade;
create index if not exists appointments_workshop_idx on public.appointments(workshop_id);

alter table public.invoices
  drop constraint if exists invoices_workshop_fk,
  add constraint invoices_workshop_fk foreign key (workshop_id)
    references public.workshops(id) on delete cascade;
create index if not exists invoices_workshop_idx on public.invoices(workshop_id);

alter table public.invoice_items
  drop constraint if exists invoice_items_workshop_fk,
  add constraint invoice_items_workshop_fk foreign key (workshop_id)
    references public.workshops(id) on delete cascade;
create index if not exists invoice_items_workshop_idx on public.invoice_items(workshop_id);

alter table public.notifications
  drop constraint if exists notifications_workshop_fk,
  add constraint notifications_workshop_fk foreign key (workshop_id)
    references public.workshops(id) on delete cascade;
create index if not exists notifications_workshop_idx on public.notifications(workshop_id);

-- 4) NOT NULL (tutti i dati esistenti hanno workshop_id grazie al backfill)
alter table public.leads alter column workshop_id set not null;
alter table public.customers alter column workshop_id set not null;
alter table public.cases alter column workshop_id set not null;
alter table public.documents alter column workshop_id set not null;
alter table public.notes alter column workshop_id set not null;
alter table public.vehicles alter column workshop_id set not null;
alter table public.appointments alter column workshop_id set not null;
alter table public.invoices alter column workshop_id set not null;
alter table public.invoice_items alter column workshop_id set not null;
alter table public.notifications alter column workshop_id set not null;

-- 5) Estendi trigger set_owner_id per popolare anche workshop_id
create or replace function public.set_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  if new.workshop_id is null then
    new.workshop_id := public.current_workshop_id();
  end if;
  return new;
end;
$$;

revoke execute on function public.set_owner_id() from anon, authenticated;

-- 6) Aggiorna notify_new_lead per impostare workshop_id sulla notifica
create or replace function public.notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws_id uuid;
begin
  if new.owner_id is null then
    return new;
  end if;

  select workshop_id into v_ws_id
  from public.profiles
  where id = new.owner_id;

  if v_ws_id is null then
    return new;
  end if;

  insert into public.notifications (owner_id, workshop_id, type, title, body, link)
  values (
    new.owner_id,
    v_ws_id,
    'new_lead',
    'Nuovo lead: ' || new.full_name,
    coalesce(
      nullif(new.phone, '') || coalesce(' · ' || nullif(new.email, ''), ''),
      new.email,
      'Nessun contatto'
    ),
    '/leads'
  );
  return new;
end;
$$;

revoke execute on function public.notify_new_lead() from anon, authenticated;

-- 7) RLS policy workshop_id-based IN AGGIUNTA (Postgres OR-merges multiple PERMISSIVE policies)
-- LEADS
create policy "leads_workshop_select" on public.leads for select
  using (workshop_id = (select current_workshop_id()));
create policy "leads_workshop_insert" on public.leads for insert
  with check (workshop_id = (select current_workshop_id()));
create policy "leads_workshop_update" on public.leads for update
  using (workshop_id = (select current_workshop_id()))
  with check (workshop_id = (select current_workshop_id()));
create policy "leads_workshop_delete" on public.leads for delete
  using (workshop_id = (select current_workshop_id()));

-- CUSTOMERS
create policy "customers_workshop_select" on public.customers for select
  using (workshop_id = (select current_workshop_id()));
create policy "customers_workshop_insert" on public.customers for insert
  with check (workshop_id = (select current_workshop_id()));
create policy "customers_workshop_update" on public.customers for update
  using (workshop_id = (select current_workshop_id()))
  with check (workshop_id = (select current_workshop_id()));
create policy "customers_workshop_delete" on public.customers for delete
  using (workshop_id = (select current_workshop_id()));

-- CASES
create policy "cases_workshop_select" on public.cases for select
  using (workshop_id = (select current_workshop_id()));
create policy "cases_workshop_insert" on public.cases for insert
  with check (workshop_id = (select current_workshop_id()));
create policy "cases_workshop_update" on public.cases for update
  using (workshop_id = (select current_workshop_id()))
  with check (workshop_id = (select current_workshop_id()));
create policy "cases_workshop_delete" on public.cases for delete
  using (workshop_id = (select current_workshop_id()));

-- DOCUMENTS
create policy "documents_workshop_select" on public.documents for select
  using (workshop_id = (select current_workshop_id()));
create policy "documents_workshop_insert" on public.documents for insert
  with check (workshop_id = (select current_workshop_id()));
create policy "documents_workshop_update" on public.documents for update
  using (workshop_id = (select current_workshop_id()))
  with check (workshop_id = (select current_workshop_id()));
create policy "documents_workshop_delete" on public.documents for delete
  using (workshop_id = (select current_workshop_id()));

-- NOTES
create policy "notes_workshop_select" on public.notes for select
  using (workshop_id = (select current_workshop_id()));
create policy "notes_workshop_insert" on public.notes for insert
  with check (workshop_id = (select current_workshop_id()));
create policy "notes_workshop_update" on public.notes for update
  using (workshop_id = (select current_workshop_id()))
  with check (workshop_id = (select current_workshop_id()));
create policy "notes_workshop_delete" on public.notes for delete
  using (workshop_id = (select current_workshop_id()));

-- VEHICLES
create policy "vehicles_workshop_select" on public.vehicles for select
  using (workshop_id = (select current_workshop_id()));
create policy "vehicles_workshop_insert" on public.vehicles for insert
  with check (workshop_id = (select current_workshop_id()));
create policy "vehicles_workshop_update" on public.vehicles for update
  using (workshop_id = (select current_workshop_id()))
  with check (workshop_id = (select current_workshop_id()));
create policy "vehicles_workshop_delete" on public.vehicles for delete
  using (workshop_id = (select current_workshop_id()));

-- APPOINTMENTS
create policy "appointments_workshop_select" on public.appointments for select
  using (workshop_id = (select current_workshop_id()));
create policy "appointments_workshop_insert" on public.appointments for insert
  with check (workshop_id = (select current_workshop_id()));
create policy "appointments_workshop_update" on public.appointments for update
  using (workshop_id = (select current_workshop_id()))
  with check (workshop_id = (select current_workshop_id()));
create policy "appointments_workshop_delete" on public.appointments for delete
  using (workshop_id = (select current_workshop_id()));

-- INVOICES
create policy "invoices_workshop_select" on public.invoices for select
  using (workshop_id = (select current_workshop_id()));
create policy "invoices_workshop_insert" on public.invoices for insert
  with check (workshop_id = (select current_workshop_id()));
create policy "invoices_workshop_update" on public.invoices for update
  using (workshop_id = (select current_workshop_id()))
  with check (workshop_id = (select current_workshop_id()));
create policy "invoices_workshop_delete" on public.invoices for delete
  using (workshop_id = (select current_workshop_id()));

-- INVOICE_ITEMS
create policy "invoice_items_workshop_select" on public.invoice_items for select
  using (workshop_id = (select current_workshop_id()));
create policy "invoice_items_workshop_insert" on public.invoice_items for insert
  with check (workshop_id = (select current_workshop_id()));
create policy "invoice_items_workshop_update" on public.invoice_items for update
  using (workshop_id = (select current_workshop_id()))
  with check (workshop_id = (select current_workshop_id()));
create policy "invoice_items_workshop_delete" on public.invoice_items for delete
  using (workshop_id = (select current_workshop_id()));

-- NOTIFICATIONS
create policy "notifications_workshop_select" on public.notifications for select
  using (workshop_id = (select current_workshop_id()));
create policy "notifications_workshop_update" on public.notifications for update
  using (workshop_id = (select current_workshop_id()))
  with check (workshop_id = (select current_workshop_id()));
create policy "notifications_workshop_delete" on public.notifications for delete
  using (workshop_id = (select current_workshop_id()));
