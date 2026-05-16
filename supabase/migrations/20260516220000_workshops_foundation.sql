-- ============================================================
-- Step 1/5 — Foundation multi-utente per officina
--
-- 1) Tabella `workshops` (azienda con dati fiscali, FB, logo, ecc.)
-- 2) profiles.workshop_id + profiles.role ('owner' | 'staff')
-- 3) Backfill: ogni profile esistente diventa owner del proprio workshop,
--    popolato con i campi che oggi sono su profiles
-- 4) Helper SQL: current_workshop_id(), is_owner()
-- 5) RLS workshops
--
-- Questo step NON cambia ancora le tabelle business (leads, cases, ecc.).
-- L'app continua a funzionare come prima (uses owner_id). Lo Step 2
-- migra owner_id -> workshop_id.
-- ============================================================

-- 1) Enum ruolo
do $$ begin
  create type user_role as enum ('owner', 'staff');
exception when duplicate_object then null; end $$;

-- 2) Aggiungi colonne a profiles (prima della creazione workshops così
--    possiamo linkare nel backfill)
alter table public.profiles
  add column if not exists workshop_id uuid,
  add column if not exists role user_role not null default 'owner';

-- 3) Tabella workshops
create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'La mia carrozzeria',
  phone text,
  vat_number text,
  tax_code text,
  address text,
  city text,
  postal_code text,
  province text,
  country text,
  iban text,
  logo_url text,
  fb_page_id text,
  fb_page_access_token text,
  fb_verify_token text default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workshops_fb_page_id_unique
  on public.workshops (fb_page_id)
  where fb_page_id is not null;

drop trigger if exists workshops_set_updated_at on public.workshops;
create trigger workshops_set_updated_at
  before update on public.workshops
  for each row execute function public.set_updated_at();

-- 4) Backfill: un workshop per ogni profile esistente
do $$
declare
  prof record;
  ws_id uuid;
begin
  for prof in select * from public.profiles where workshop_id is null loop
    insert into public.workshops (
      name, phone, vat_number, tax_code, address, city, postal_code,
      province, country, iban, logo_url, fb_page_id, fb_page_access_token,
      fb_verify_token, created_at
    ) values (
      coalesce(prof.workshop_name, 'La mia carrozzeria'),
      prof.phone, prof.vat_number, prof.tax_code, prof.address,
      prof.city, prof.postal_code, prof.province, prof.country,
      prof.iban, prof.logo_url, prof.fb_page_id, prof.fb_page_access_token,
      coalesce(prof.fb_verify_token, encode(gen_random_bytes(16), 'hex')),
      prof.created_at
    ) returning id into ws_id;

    update public.profiles
      set workshop_id = ws_id,
          role = 'owner'
      where id = prof.id;
  end loop;
end $$;

-- 5) Adesso workshop_id può diventare NOT NULL + FK
alter table public.profiles
  alter column workshop_id set not null;

alter table public.profiles
  drop constraint if exists profiles_workshop_fk;

alter table public.profiles
  add constraint profiles_workshop_fk
  foreign key (workshop_id) references public.workshops(id) on delete restrict;

create index if not exists profiles_workshop_id_idx
  on public.profiles(workshop_id);

-- 6) Helper functions
create or replace function public.current_workshop_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select workshop_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'owner',
    false
  )
$$;

revoke execute on function public.current_workshop_id() from anon;
grant execute on function public.current_workshop_id() to authenticated;
revoke execute on function public.is_owner() from anon;
grant execute on function public.is_owner() to authenticated;

-- 7) RLS su workshops
alter table public.workshops enable row level security;

drop policy if exists "workshops_select_own" on public.workshops;
create policy "workshops_select_own"
  on public.workshops for select
  using (id = (select current_workshop_id()) or (select is_admin()));

drop policy if exists "workshops_update_owner" on public.workshops;
create policy "workshops_update_owner"
  on public.workshops for update
  using (
    (id = (select current_workshop_id()) and (select is_owner()))
    or (select is_admin())
  )
  with check (
    (id = (select current_workshop_id()) and (select is_owner()))
    or (select is_admin())
  );

drop policy if exists "workshops_insert_admin" on public.workshops;
create policy "workshops_insert_admin"
  on public.workshops for insert
  with check ((select is_admin()));

drop policy if exists "workshops_delete_admin" on public.workshops;
create policy "workshops_delete_admin"
  on public.workshops for delete
  using ((select is_admin()));
