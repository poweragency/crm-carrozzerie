-- revenue_daily ora rappresenta il fatturato INCASSATO (sole pratiche
-- 'liquidato') in modalità CUMULATIVA: per ogni giorno della finestra
-- viene riportato il totale incassato dalla nascita del workshop fino
-- a quel giorno, non l'importo del singolo giorno.
--
-- Vantaggi:
--  - la linea sul dashboard non torna a zero tra una liquidazione e
--    l'altra: resta al livello raggiunto e sale a gradini quando
--    arriva un nuovo incasso (richiesta esplicita di Mattia).
--  - resta coerente con 'revenue_collected' (sum totale a oggi delle
--    pratiche liquidate).
-- Limite: usiamo created_at come timestamp di riferimento per il
-- giorno di accredito. È un'approssimazione (manca un campo
-- liquidated_at), ma per la maggior parte dei flussi del CRM la
-- pratica viene creata, lavorata e liquidata nell'arco di pochi
-- giorni e questo dà comunque una linea coerente.

create or replace function public.get_dashboard_stats(p_days int default 30)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  with
  ws as (select public.current_workshop_id() as id),
  bucket_days as (
    select generate_series(
      (current_date - (p_days - 1))::date,
      current_date::date,
      interval '1 day'
    )::date as day
  ),
  leads_daily as (
    select date_trunc('day', l.created_at)::date as day, count(*)::int as n
    from public.leads l, ws
    where l.workshop_id = ws.id
      and l.created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  customers_daily as (
    select date_trunc('day', c.created_at)::date as day, count(*)::int as n
    from public.customers c, ws
    where c.workshop_id = ws.id
      and c.created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  cases_filtered as (
    select c.* from public.cases c, ws
    where c.workshop_id = ws.id and c.archived_at is null
  ),
  open_cases_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_filtered
    where status in ('preparazione', 'verniciatura', 'finitura')
      and created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  completed_cases_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_filtered
    where status in ('completata', 'consegnata', 'liquidato')
      and created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  -- Pratiche liquidate dentro la finestra → incremento giornaliero.
  collected_added_daily as (
    select date_trunc('day', created_at)::date as day,
           coalesce(sum(price), 0)::numeric as added
    from cases_filtered
    where status = 'liquidato'
      and created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  -- Pratiche liquidate PRIMA della finestra → base di partenza.
  collected_base as (
    select coalesce(sum(price), 0)::numeric as total
    from cases_filtered
    where status = 'liquidato'
      and created_at < (current_date - (p_days - 1))
  ),
  revenue_cumulative as (
    select b.day,
           ((select total from collected_base)
            + coalesce(sum(coalesce(cad.added, 0))
                       over (order by b.day rows between unbounded preceding and current row),
                       0))::numeric as total
    from bucket_days b
    left join collected_added_daily cad on cad.day = b.day
  ),
  status_counts as (
    select status, count(*)::int as n
    from cases_filtered
    group by status
  )
  select jsonb_build_object(
    'leads_total', (select count(*) from public.leads l, ws where l.workshop_id = ws.id),
    'customers_total', (select count(*) from public.customers c, ws where c.workshop_id = ws.id),
    'open_cases_total', (select count(*) from cases_filtered where status in ('preparazione', 'verniciatura', 'finitura')),
    'completed_cases_total', (select count(*) from cases_filtered where status in ('completata', 'consegnata', 'liquidato')),
    'revenue_total', (select coalesce(sum(price), 0) from cases_filtered),
    'revenue_collected', (select coalesce(sum(price), 0) from cases_filtered where status = 'liquidato'),
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
      select coalesce(jsonb_agg(rc.total order by rc.day), '[]'::jsonb)
      from revenue_cumulative rc
    ),
    'status_counts', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from status_counts
    )
  );
$$;
