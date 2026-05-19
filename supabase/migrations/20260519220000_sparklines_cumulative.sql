-- Sparkline cumulativi anche per Lead/Clienti/Pratiche aperte/
-- Pratiche completate sulle KPI card della dashboard. Stessa logica
-- di revenue_daily: per ogni giorno della finestra riporta il totale
-- accumulato fino a quel punto, sommando una "base" pre-finestra
-- alle nascite interne, così la linea non spike-a a 0 ogni giorno.
--
-- Conseguenza utile: il valore finale di ogni sparkline coincide con
-- il KPI mostrato sopra la linea (leads_total, customers_total,
-- open_cases_total, completed_cases_total).
--
-- Per open/completed usiamo lo status CORRENTE delle pratiche, con
-- created_at come asse temporale: una pratica oggi 'completata' che
-- è nata 10 giorni fa entra nel completed_spark dal giorno 10 in poi.

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

  -- LEADS: cumulativo a partire da base pre-finestra
  leads_base as (
    select count(*)::int as total
    from public.leads l, ws
    where l.workshop_id = ws.id
      and l.created_at < (current_date - (p_days - 1))
  ),
  leads_added_daily as (
    select date_trunc('day', l.created_at)::date as day, count(*)::int as n
    from public.leads l, ws
    where l.workshop_id = ws.id
      and l.created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  leads_cumulative as (
    select b.day,
           ((select total from leads_base)
            + coalesce(sum(coalesce(lad.n, 0))
                       over (order by b.day rows between unbounded preceding and current row),
                       0))::int as total
    from bucket_days b
    left join leads_added_daily lad on lad.day = b.day
  ),

  -- CUSTOMERS: cumulativo
  customers_base as (
    select count(*)::int as total
    from public.customers c, ws
    where c.workshop_id = ws.id
      and c.created_at < (current_date - (p_days - 1))
  ),
  customers_added_daily as (
    select date_trunc('day', c.created_at)::date as day, count(*)::int as n
    from public.customers c, ws
    where c.workshop_id = ws.id
      and c.created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  customers_cumulative as (
    select b.day,
           ((select total from customers_base)
            + coalesce(sum(coalesce(cad.n, 0))
                       over (order by b.day rows between unbounded preceding and current row),
                       0))::int as total
    from bucket_days b
    left join customers_added_daily cad on cad.day = b.day
  ),

  cases_filtered as (
    select c.* from public.cases c, ws
    where c.workshop_id = ws.id and c.archived_at is null
  ),

  -- OPEN cases (status corrente in produzione): cumulativo per
  -- created_at. Pratica nata 20gg fa, oggi ancora in verniciatura
  -- → entra nello spark dal giorno 20 in poi.
  open_base as (
    select count(*)::int as total
    from cases_filtered
    where status in ('preparazione', 'verniciatura', 'finitura')
      and created_at < (current_date - (p_days - 1))
  ),
  open_added_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_filtered
    where status in ('preparazione', 'verniciatura', 'finitura')
      and created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  open_cumulative as (
    select b.day,
           ((select total from open_base)
            + coalesce(sum(coalesce(oad.n, 0))
                       over (order by b.day rows between unbounded preceding and current row),
                       0))::int as total
    from bucket_days b
    left join open_added_daily oad on oad.day = b.day
  ),

  -- COMPLETED (post-produzione): cumulativo per created_at sulle
  -- pratiche oggi completata/consegnata/liquidato.
  completed_base as (
    select count(*)::int as total
    from cases_filtered
    where status in ('completata', 'consegnata', 'liquidato')
      and created_at < (current_date - (p_days - 1))
  ),
  completed_added_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_filtered
    where status in ('completata', 'consegnata', 'liquidato')
      and created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  completed_cumulative as (
    select b.day,
           ((select total from completed_base)
            + coalesce(sum(coalesce(cad.n, 0))
                       over (order by b.day rows between unbounded preceding and current row),
                       0))::int as total
    from bucket_days b
    left join completed_added_daily cad on cad.day = b.day
  ),

  -- REVENUE incassato cumulativo (già introdotto nella 20260519210000)
  collected_added_daily as (
    select date_trunc('day', created_at)::date as day,
           coalesce(sum(price), 0)::numeric as added
    from cases_filtered
    where status = 'liquidato'
      and created_at >= (current_date - (p_days - 1))
    group by 1
  ),
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
      select coalesce(jsonb_agg(lc.total order by lc.day), '[]'::jsonb)
      from leads_cumulative lc
    ),
    'customers_spark', (
      select coalesce(jsonb_agg(cc.total order by cc.day), '[]'::jsonb)
      from customers_cumulative cc
    ),
    'open_cases_spark', (
      select coalesce(jsonb_agg(oc.total order by oc.day), '[]'::jsonb)
      from open_cumulative oc
    ),
    'completed_spark', (
      select coalesce(jsonb_agg(cc.total order by cc.day), '[]'::jsonb)
      from completed_cumulative cc
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
