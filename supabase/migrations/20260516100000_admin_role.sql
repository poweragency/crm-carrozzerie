-- ============================================================
-- ADMIN ROLE
-- Identificato da auth.users.raw_app_meta_data->>'is_admin' = 'true'.
-- Modificabile solo via service_role (non da client).
-- ============================================================

-- Helper: legge il flag is_admin direttamente da auth.users
-- (non dal JWT, così non serve re-login dopo una promozione)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (raw_app_meta_data ->> 'is_admin')::boolean
     from auth.users
     where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ============================================================
-- Profiles SELECT: l'utente vede solo se stesso, l'admin vede tutto
-- ============================================================

drop policy if exists "profiles_select_all" on public.profiles;

create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- ============================================================
-- RPC: admin_get_workshops()
-- Ritorna tutte le officine + statistiche aggregate.
-- Accesso solo per admin (raise exception altrimenti).
-- ============================================================

create or replace function public.admin_get_workshops()
returns table (
  id uuid,
  email text,
  workshop_name text,
  phone text,
  vat_number text,
  tax_code text,
  address text,
  city text,
  postal_code text,
  province text,
  facebook_connected boolean,
  registered_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  email_confirmed boolean,
  leads_count bigint,
  cases_count bigint,
  cases_open_count bigint,
  revenue_total numeric,
  invoices_count bigint,
  documents_count bigint
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
    u.email::text,
    p.workshop_name,
    p.phone,
    p.vat_number,
    p.tax_code,
    p.address,
    p.city,
    p.postal_code,
    p.province,
    (p.fb_page_id is not null) as facebook_connected,
    p.created_at as registered_at,
    u.last_sign_in_at,
    u.banned_until,
    (u.email_confirmed_at is not null) as email_confirmed,
    (select count(*) from public.leads where owner_id = p.id) as leads_count,
    (select count(*) from public.cases where owner_id = p.id) as cases_count,
    (select count(*) from public.cases
       where owner_id = p.id
       and status in ('preventivo','attesa_pezzi','lavorazione')) as cases_open_count,
    (select coalesce(sum(price), 0) from public.cases where owner_id = p.id) as revenue_total,
    (select count(*) from public.invoices where owner_id = p.id) as invoices_count,
    (select count(*) from public.documents where owner_id = p.id) as documents_count
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_get_workshops() to authenticated;
