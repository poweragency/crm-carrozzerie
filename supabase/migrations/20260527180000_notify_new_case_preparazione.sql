-- ============================================================
-- Notifica ai preparatori alla creazione di una nuova pratica in preparazione.
--
-- AFTER INSERT su cases: se la pratica nasce in 'preparazione' (fase 1) avvisa
-- tutti i preparatori del workshop ("Nuova pratica, da preparare"). Una notifica
-- per destinatario (RLS owner_id la mostra solo a lui). Le notifiche vengono
-- ripulite quando la pratica avanza (vedi notify_finitura_done).
-- ============================================================

create or replace function public.notify_new_case()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link text;
  v_customer text;
  v_vehicle text;
  v_body text;
begin
  if new.status <> 'preparazione' then
    return new;
  end if;

  v_link := '/cases/' || new.id::text;

  select full_name into v_customer from public.customers where id = new.customer_id;
  select nullif(concat_ws(' ', make, model, plate), '') into v_vehicle
  from public.vehicles where id = new.vehicle_id;
  v_body := coalesce(v_customer, 'Cliente')
    || case when v_vehicle is not null then ' · ' || v_vehicle else '' end;

  insert into public.notifications (owner_id, workshop_id, type, title, body, link)
  select p.id, new.workshop_id, 'case_status_change', 'Nuova pratica, da preparare', v_body, v_link
  from public.profiles p
  where p.workshop_id = new.workshop_id and p.role = 'preparatore';

  return new;
end;
$$;

revoke execute on function public.notify_new_case() from anon, authenticated;

drop trigger if exists trg_notify_new_case on public.cases;
create trigger trg_notify_new_case
  after insert on public.cases
  for each row execute function public.notify_new_case();
