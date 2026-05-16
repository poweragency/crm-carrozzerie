-- ============================================================
-- delete_lead_cascade: elimina lead + pratiche aperte del customer
-- linked. Il customer e le pratiche chiuse (completata/consegnata)
-- vengono preservate come storico.
-- ============================================================

create or replace function public.delete_lead_cascade(p_lead_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (
    select 1 from public.leads
    where id = p_lead_id and owner_id = v_uid
  ) then
    raise exception 'forbidden';
  end if;

  -- Elimina pratiche aperte (preventivo, attesa_pezzi, lavorazione) del
  -- customer linked al lead. Le pratiche chiuse restano come storico.
  delete from public.cases
  where status in ('preventivo', 'attesa_pezzi', 'lavorazione')
    and customer_id in (
      select id from public.customers
      where lead_id = p_lead_id and owner_id = v_uid
    )
    and owner_id = v_uid;

  -- Elimina il lead. customers.lead_id è ON DELETE SET NULL: il customer
  -- resta nel CRM, scollegato dal lead.
  delete from public.leads
  where id = p_lead_id and owner_id = v_uid;
end;
$$;

revoke execute on function public.delete_lead_cascade(uuid) from anon;
grant execute on function public.delete_lead_cascade(uuid) to authenticated;
