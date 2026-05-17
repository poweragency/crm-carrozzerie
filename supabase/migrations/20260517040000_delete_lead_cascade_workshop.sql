-- ============================================================
-- Fix delete_lead_cascade: dopo la migrazione a workshop_id, l'RPC
-- controllava ancora owner_id = auth.uid() e ritornava 'forbidden'
-- per gli staff (e per chiunque non fosse il creatore originario).
-- Ora il check è basato sul workshop dell'utente loggato.
-- ============================================================

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

  -- Elimina pratiche aperte (preventivo, attesa_pezzi, lavorazione) del
  -- customer linked al lead. Le pratiche chiuse restano come storico.
  delete from public.cases
  where status in ('preventivo', 'attesa_pezzi', 'lavorazione')
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
