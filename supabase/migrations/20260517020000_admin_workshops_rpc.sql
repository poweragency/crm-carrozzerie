-- ============================================================
-- Admin: riscrive admin_get_workshops per ritornare 1 record per workshop
-- (era 1 per profile/user, sbagliato col modello multi-user).
-- Aggiunge admin_get_workshop_members(workshop_id) per il drawer.
-- ============================================================

create or replace function public.admin_get_workshops()
returns table(
  id uuid,
  name text,
  vat_number text,
  tax_code text,
  address text,
  city text,
  postal_code text,
  province text,
  owner_email text,
  owner_full_name text,
  owner_phone text,
  facebook_connected boolean,
  members_count bigint,
  staff_count bigint,
  leads_count bigint,
  cases_count bigint,
  cases_open_count bigint,
  revenue_total numeric,
  invoices_count bigint,
  documents_count bigint,
  registered_at timestamptz,
  last_activity_at timestamptz
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
    w.id,
    w.name,
    w.vat_number,
    w.tax_code,
    w.address,
    w.city,
    w.postal_code,
    w.province,
    (
      select u.email::text
      from public.profiles op
      join auth.users u on u.id = op.id
      where op.workshop_id = w.id and op.role = 'owner'
      order by op.created_at asc
      limit 1
    ) as owner_email,
    (
      select op.full_name
      from public.profiles op
      where op.workshop_id = w.id and op.role = 'owner'
      order by op.created_at asc
      limit 1
    ) as owner_full_name,
    w.phone as owner_phone,
    (w.fb_page_id is not null) as facebook_connected,
    (select count(*) from public.profiles where workshop_id = w.id) as members_count,
    (select count(*) from public.profiles where workshop_id = w.id and role = 'staff') as staff_count,
    (select count(*) from public.leads where workshop_id = w.id) as leads_count,
    (select count(*) from public.cases where workshop_id = w.id) as cases_count,
    (select count(*) from public.cases
       where workshop_id = w.id
       and status in ('preventivo','attesa_pezzi','lavorazione')) as cases_open_count,
    (select coalesce(sum(price), 0) from public.cases where workshop_id = w.id) as revenue_total,
    (select count(*) from public.invoices where workshop_id = w.id) as invoices_count,
    (select count(*) from public.documents where workshop_id = w.id) as documents_count,
    w.created_at as registered_at,
    (
      select max(u.last_sign_in_at)
      from public.profiles op
      join auth.users u on u.id = op.id
      where op.workshop_id = w.id
    ) as last_activity_at
  from public.workshops w
  order by w.created_at desc;
end;
$$;

revoke execute on function public.admin_get_workshops() from anon;
grant execute on function public.admin_get_workshops() to authenticated;

-- Dettaglio membri di un workshop (per il drawer admin)
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
