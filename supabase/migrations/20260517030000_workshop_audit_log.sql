-- ============================================================
-- workshop_audit_log: traccia chi (owner/staff) ha fatto cosa nei dati
-- operativi del workshop. Catturato tramite trigger su:
--   - DELETE: leads, customers, cases, vehicles, invoices, documents
--   - UPDATE status: cases (preventivo→consegnata), invoices (bozza→pagato)
--
-- Snapshot dell'attore (nome+ruolo) e dell'entità (label leggibile) sono
-- preservati anche se la riga viene eliminata in seguito.
-- ============================================================

create table if not exists public.workshop_audit_log (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_full_name text,
  actor_role user_role,
  action text not null,                -- 'delete' | 'status_change' | 'create' (futuro)
  entity_type text not null,           -- 'lead' | 'customer' | 'case' | 'vehicle' | 'invoice' | 'document'
  entity_id uuid,
  entity_label text,                   -- snapshot leggibile ("PREV-2026-001", "Mario Rossi", ecc.)
  changes jsonb,                       -- es. {"status": ["preventivo", "consegnata"]}
  created_at timestamptz not null default now()
);

create index if not exists workshop_audit_log_workshop_idx
  on public.workshop_audit_log(workshop_id, created_at desc);
create index if not exists workshop_audit_log_actor_idx
  on public.workshop_audit_log(actor_id, created_at desc);

alter table public.workshop_audit_log enable row level security;

drop policy if exists "workshop_audit_log_select_owner_or_admin" on public.workshop_audit_log;
create policy "workshop_audit_log_select_owner_or_admin"
  on public.workshop_audit_log for select
  using (
    (workshop_id = (select current_workshop_id()) and (select is_owner()))
    or (select is_admin())
  );

-- ============================================================
-- Helper: snapshot dell'attore + workshop
-- ============================================================
create or replace function public.audit_actor_info(out actor_id uuid, out workshop_id uuid, out full_name text, out role user_role)
language plpgsql
security definer
set search_path = public
as $$
begin
  actor_id := auth.uid();
  if actor_id is null then
    workshop_id := null;
    full_name := null;
    role := null;
    return;
  end if;
  select p.workshop_id, p.full_name, p.role
    into workshop_id, full_name, role
  from public.profiles p where p.id = actor_id;
end;
$$;

revoke execute on function public.audit_actor_info() from anon, authenticated;

-- ============================================================
-- DELETE triggers — generici
-- ============================================================

-- LEADS
create or replace function public.audit_lead_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.audit_actor_info();
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'lead', old.id, old.full_name);
  return old;
end;
$$;

-- CUSTOMERS
create or replace function public.audit_customer_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.audit_actor_info();
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'customer', old.id, old.full_name);
  return old;
end;
$$;

-- CASES
create or replace function public.audit_case_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a record;
  v_cust text;
begin
  select * into a from public.audit_actor_info();
  select c.full_name into v_cust from public.customers c where c.id = old.customer_id;
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'case', old.id,
     coalesce(v_cust, 'Pratica') || ' · ' || old.status);
  return old;
end;
$$;

-- VEHICLES
create or replace function public.audit_vehicle_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.audit_actor_info();
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'vehicle', old.id,
     coalesce(nullif(concat_ws(' ', old.make, old.model), ''), old.plate, 'Veicolo'));
  return old;
end;
$$;

-- INVOICES
create or replace function public.audit_invoice_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.audit_actor_info();
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'invoice', old.id,
     old.kind::text || ' ' || old.number);
  return old;
end;
$$;

-- DOCUMENTS
create or replace function public.audit_document_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.audit_actor_info();
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'document', old.id, old.file_name);
  return old;
end;
$$;

-- ============================================================
-- STATUS CHANGE triggers (UPDATE) — cases + invoices
-- ============================================================

create or replace function public.audit_case_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a record;
  v_cust text;
begin
  if old.status is distinct from new.status then
    select * into a from public.audit_actor_info();
    select c.full_name into v_cust from public.customers c where c.id = new.customer_id;
    insert into public.workshop_audit_log
      (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label, changes)
    values
      (new.workshop_id, a.actor_id, a.full_name, a.role,
       'status_change', 'case', new.id,
       coalesce(v_cust, 'Pratica'),
       jsonb_build_object('status', jsonb_build_array(old.status, new.status)));
  end if;
  return new;
end;
$$;

create or replace function public.audit_invoice_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if old.status is distinct from new.status then
    select * into a from public.audit_actor_info();
    insert into public.workshop_audit_log
      (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label, changes)
    values
      (new.workshop_id, a.actor_id, a.full_name, a.role,
       'status_change', 'invoice', new.id,
       new.kind::text || ' ' || new.number,
       jsonb_build_object('status', jsonb_build_array(old.status, new.status)));
  end if;
  return new;
end;
$$;

-- Revoke + grant trigger functions
revoke execute on function public.audit_lead_delete() from anon, authenticated;
revoke execute on function public.audit_customer_delete() from anon, authenticated;
revoke execute on function public.audit_case_delete() from anon, authenticated;
revoke execute on function public.audit_vehicle_delete() from anon, authenticated;
revoke execute on function public.audit_invoice_delete() from anon, authenticated;
revoke execute on function public.audit_document_delete() from anon, authenticated;
revoke execute on function public.audit_case_status_change() from anon, authenticated;
revoke execute on function public.audit_invoice_status_change() from anon, authenticated;

-- ============================================================
-- Attach triggers
-- ============================================================
drop trigger if exists trg_audit_lead_delete on public.leads;
create trigger trg_audit_lead_delete
  before delete on public.leads
  for each row execute function public.audit_lead_delete();

drop trigger if exists trg_audit_customer_delete on public.customers;
create trigger trg_audit_customer_delete
  before delete on public.customers
  for each row execute function public.audit_customer_delete();

drop trigger if exists trg_audit_case_delete on public.cases;
create trigger trg_audit_case_delete
  before delete on public.cases
  for each row execute function public.audit_case_delete();

drop trigger if exists trg_audit_vehicle_delete on public.vehicles;
create trigger trg_audit_vehicle_delete
  before delete on public.vehicles
  for each row execute function public.audit_vehicle_delete();

drop trigger if exists trg_audit_invoice_delete on public.invoices;
create trigger trg_audit_invoice_delete
  before delete on public.invoices
  for each row execute function public.audit_invoice_delete();

drop trigger if exists trg_audit_document_delete on public.documents;
create trigger trg_audit_document_delete
  before delete on public.documents
  for each row execute function public.audit_document_delete();

drop trigger if exists trg_audit_case_status_change on public.cases;
create trigger trg_audit_case_status_change
  after update on public.cases
  for each row execute function public.audit_case_status_change();

drop trigger if exists trg_audit_invoice_status_change on public.invoices;
create trigger trg_audit_invoice_status_change
  after update on public.invoices
  for each row execute function public.audit_invoice_status_change();
