-- ============================================================
-- Ruoli dipendente per fase di carrozzeria.
--
-- Sostituisce l'enum user_role ('owner','staff') con il flusso a mansioni:
--   'owner','preparatore','verniciatore','finitore'.
-- Lo 'staff' generico viene eliminato; gli staff esistenti migrano a
-- 'preparatore' (il titolare potrà riassegnarli dalla pagina Team).
--
-- Pattern di ricreazione enum identico a 20260519100000 (case_status):
-- crea tipo *_new, converte le colonne con USING, droppa il vecchio, rinomina.
--
-- Dipendenze sul tipo user_role gestite in questa stessa transazione:
--   - profiles.role                       (colonna)
--   - workshop_audit_log.actor_role       (colonna)
--   - public.audit_actor_info(... role user_role)  (tipo nella firma → va droppata
--     prima del drop type e ricreata dopo il rename)
--   - public.handle_new_user()            (usa il valore 'staff')
--   - public.admin_get_workshops()        (conta role = 'staff')
-- Le funzioni che confrontano solo il literal di testo 'owner' (es. is_owner)
-- restano valide: 'owner' sopravvive nel nuovo enum.
-- ============================================================

-- 1) Nuovo tipo
create type user_role_new as enum (
  'owner',
  'preparatore',
  'verniciatore',
  'finitore'
);

-- 2) profiles.role → nuovo tipo (staff → preparatore)
alter table public.profiles
  alter column role drop default;

alter table public.profiles
  alter column role type user_role_new
  using (
    case role::text
      when 'owner' then 'owner'::user_role_new
      when 'staff' then 'preparatore'::user_role_new
      else 'owner'::user_role_new
    end
  );

alter table public.profiles
  alter column role set default 'owner'::user_role_new;

-- 3) workshop_audit_log.actor_role → nuovo tipo (snapshot storici)
alter table public.workshop_audit_log
  alter column actor_role type user_role_new
  using (
    case actor_role::text
      when 'owner' then 'owner'::user_role_new
      when 'staff' then 'preparatore'::user_role_new
      else null
    end
  );

-- 4) Drop funzioni col tipo in firma, drop vecchio tipo, rename.
--    (audit_actor_info: OUT role user_role; admin_get_workshop_members: role user_role nel return)
drop function if exists public.audit_actor_info();
drop function if exists public.admin_get_workshop_members(uuid);
drop type public.user_role;
alter type public.user_role_new rename to user_role;

-- 5) Ricrea audit_actor_info (identica — ora con il tipo rinominato)
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

-- 6) handle_new_user: accetta le 3 mansioni (default 'owner')
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workshop_id uuid;
  v_role user_role;
  v_meta_ws_id text := new.raw_user_meta_data->>'workshop_id';
  v_meta_role text := new.raw_user_meta_data->>'role';
  v_workshop_name text := coalesce(
    new.raw_user_meta_data->>'workshop_name',
    'La mia carrozzeria'
  );
  v_full_name text := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.email
  );
begin
  -- Mansione dipendente solo se esplicitamente richiesta; altrimenti owner.
  v_role := case
    when v_meta_role in ('preparatore', 'verniciatore', 'finitore')
      then v_meta_role::user_role
    else 'owner'::user_role
  end;

  if v_meta_ws_id is not null and v_meta_ws_id <> '' then
    v_workshop_id := v_meta_ws_id::uuid;
  else
    insert into public.workshops (name)
    values (v_workshop_name)
    returning id into v_workshop_id;
  end if;

  insert into public.profiles (id, full_name, workshop_id, role, workshop_name)
  values (
    new.id,
    v_full_name,
    v_workshop_id,
    v_role,
    v_workshop_name
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated;

-- 7) admin_get_workshops: staff_count ora = membri non-owner
create or replace function public.admin_get_workshops()
returns table(
  id uuid, name text, vat_number text, tax_code text, address text, city text,
  postal_code text, province text, owner_email text, owner_full_name text,
  owner_phone text, facebook_connected boolean, members_count bigint,
  staff_count bigint, leads_count bigint, cases_count bigint,
  cases_open_count bigint, revenue_total numeric, invoices_count bigint,
  documents_count bigint, registered_at timestamp with time zone,
  last_activity_at timestamp with time zone
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    w.id, w.name, w.vat_number, w.tax_code, w.address, w.city,
    w.postal_code, w.province,
    (select u.email::text from public.profiles op
       join auth.users u on u.id = op.id
       where op.workshop_id = w.id and op.role = 'owner'
       order by op.created_at asc limit 1) as owner_email,
    (select op.full_name from public.profiles op
       where op.workshop_id = w.id and op.role = 'owner'
       order by op.created_at asc limit 1) as owner_full_name,
    w.phone as owner_phone,
    (w.fb_page_id is not null) as facebook_connected,
    (select count(*) from public.profiles where workshop_id = w.id) as members_count,
    (select count(*) from public.profiles where workshop_id = w.id and role <> 'owner') as staff_count,
    (select count(*) from public.leads where workshop_id = w.id) as leads_count,
    (select count(*) from public.cases where workshop_id = w.id) as cases_count,
    (select count(*) from public.cases
       where workshop_id = w.id
       and status in ('preparazione','verniciatura','finitura')) as cases_open_count,
    (select coalesce(sum(price), 0) from public.cases where workshop_id = w.id) as revenue_total,
    (select count(*) from public.invoices where workshop_id = w.id) as invoices_count,
    (select count(*) from public.documents where workshop_id = w.id) as documents_count,
    w.created_at as registered_at,
    (select max(u.last_sign_in_at) from public.profiles op
       join auth.users u on u.id = op.id
       where op.workshop_id = w.id) as last_activity_at
  from public.workshops w
  order by w.created_at desc;
end;
$function$;

revoke execute on function public.admin_get_workshops() from anon;
grant execute on function public.admin_get_workshops() to authenticated;

-- 8) Ricrea admin_get_workshop_members (identica — role user_role nel return)
create or replace function public.admin_get_workshop_members(p_workshop_id uuid)
returns table(
  id uuid,
  full_name text,
  email text,
  role user_role,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  email_confirmed boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.id,
    p.full_name,
    u.email::text,
    p.role,
    p.created_at,
    u.last_sign_in_at,
    u.banned_until,
    (u.email_confirmed_at is not null) as email_confirmed
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.workshop_id = p_workshop_id
  order by
    case p.role when 'owner' then 0 else 1 end,
    p.created_at asc;
end;
$$;

revoke execute on function public.admin_get_workshop_members(uuid) from anon;
grant execute on function public.admin_get_workshop_members(uuid) to authenticated;
