-- ============================================================
-- Archivio pratiche incomplete
--
-- Quando un lead viene eliminato, le pratiche aperte ad esso collegate
-- non vengono più cancellate ma archiviate. Restano nel CRM, accessibili
-- dalla scheda cliente in una sezione "Incomplete", e possono essere
-- riprese impostando archived_at = NULL. Tutti i dati collegati
-- (invoices, documents, notes) rimangono intatti perché la riga cases
-- non viene mai eliminata.
-- ============================================================

-- 1) Colonne archivio
alter table public.cases
  add column if not exists archived_at timestamptz,
  add column if not exists archived_reason text;

-- Indice parziale per filtri su archived (la stragrande maggioranza
-- delle pratiche ha archived_at null, quindi il partial index è
-- nettamente più piccolo).
create index if not exists cases_archived_idx
  on public.cases(customer_id, archived_at)
  where archived_at is not null;

-- 2) delete_lead_cascade: ora archivia le pratiche aperte invece di
-- eliminarle.
create or replace function public.delete_lead_cascade(p_lead_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ws uuid := public.current_workshop_id();
begin
  if v_ws is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (
    select 1 from public.leads
    where id = p_lead_id and workshop_id = v_ws
  ) then
    raise exception 'forbidden';
  end if;

  -- Archivia (non elimina) le pratiche aperte del customer collegato al
  -- lead. Le pratiche chiuse non vengono toccate.
  update public.cases
  set archived_at = now(),
      archived_reason = 'lead_deleted'
  where status in ('preventivo', 'attesa_pezzi', 'lavorazione')
    and archived_at is null
    and customer_id in (
      select id from public.customers
      where lead_id = p_lead_id and workshop_id = v_ws
    )
    and workshop_id = v_ws;

  -- Elimina il lead. customers.lead_id è ON DELETE SET NULL: il customer
  -- resta nel CRM, scollegato dal lead.
  delete from public.leads
  where id = p_lead_id and workshop_id = v_ws;
end;
$$;

revoke execute on function public.delete_lead_cascade(uuid) from anon;
grant execute on function public.delete_lead_cascade(uuid) to authenticated;

-- 3) get_dashboard_stats: esclude pratiche archiviate dai conteggi e
-- dal fatturato (restano invisibili finché non vengono riprese).
create or replace function public.get_dashboard_stats(p_days int default 30)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  with
  uid as (select auth.uid() as id),
  bucket_days as (
    select generate_series(
      (current_date - (p_days - 1))::date,
      current_date::date,
      interval '1 day'
    )::date as day
  ),
  leads_daily as (
    select date_trunc('day', l.created_at)::date as day, count(*)::int as n
    from public.leads l, uid
    where l.owner_id = uid.id
      and l.created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  customers_daily as (
    select date_trunc('day', c.created_at)::date as day, count(*)::int as n
    from public.customers c, uid
    where c.owner_id = uid.id
      and c.created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  cases_filtered as (
    select c.* from public.cases c, uid
    where c.owner_id = uid.id and c.archived_at is null
  ),
  open_cases_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_filtered
    where status in ('preventivo', 'attesa_pezzi', 'lavorazione')
      and created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  completed_cases_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_filtered
    where status in ('completata', 'consegnata')
      and created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  revenue_daily as (
    select date_trunc('day', created_at)::date as day, coalesce(sum(price), 0)::numeric as total
    from cases_filtered
    where created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  status_counts as (
    select status, count(*)::int as n
    from cases_filtered
    group by status
  )
  select jsonb_build_object(
    'leads_total', (select count(*) from public.leads l, uid where l.owner_id = uid.id),
    'customers_total', (select count(*) from public.customers c, uid where c.owner_id = uid.id),
    'open_cases_total', (select count(*) from cases_filtered where status in ('preventivo', 'attesa_pezzi', 'lavorazione')),
    'completed_cases_total', (select count(*) from cases_filtered where status in ('completata', 'consegnata')),
    'revenue_total', (select coalesce(sum(price), 0) from cases_filtered),
    'revenue_collected', (select coalesce(sum(price), 0) from cases_filtered where status = 'consegnata'),
    'leads_spark', (
      select coalesce(jsonb_agg(coalesce(l.n, 0) order by b.day), '[]'::jsonb)
      from bucket_days b left join leads_daily l on l.day = b.day
    ),
    'customers_spark', (
      select coalesce(jsonb_agg(coalesce(c.n, 0) order by b.day), '[]'::jsonb)
      from bucket_days b left join customers_daily c on c.day = b.day
    ),
    'open_cases_spark', (
      select coalesce(jsonb_agg(coalesce(o.n, 0) order by b.day), '[]'::jsonb)
      from bucket_days b left join open_cases_daily o on o.day = b.day
    ),
    'completed_spark', (
      select coalesce(jsonb_agg(coalesce(c.n, 0) order by b.day), '[]'::jsonb)
      from bucket_days b left join completed_cases_daily c on c.day = b.day
    ),
    'revenue_daily', (
      select coalesce(jsonb_agg(coalesce(r.total, 0)::numeric order by b.day), '[]'::jsonb)
      from bucket_days b left join revenue_daily r on r.day = b.day
    ),
    'status_counts', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from status_counts
    )
  );
$$;

grant execute on function public.get_dashboard_stats(int) to authenticated;
