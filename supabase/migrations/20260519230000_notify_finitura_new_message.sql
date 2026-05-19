-- Aggiorna il testo della notifica di finitura conclusa.
-- Title nuovo: "Finitura auto completata, clicca per verificare".
-- Body resta: cliente + veicolo (contesto per riconoscere la pratica).

create or replace function public.notify_finitura_done()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_owner_id uuid;
  v_customer text;
  v_vehicle text;
  v_link text;
  v_was_post boolean;
  v_is_post boolean;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  v_was_post := old.status in ('completata', 'consegnata', 'liquidato');
  v_is_post := new.status in ('completata', 'consegnata', 'liquidato');
  v_link := '/cases/' || new.id::text;

  if v_was_post and not v_is_post then
    delete from public.notifications
    where type = 'case_status_change' and link = v_link;
    return new;
  end if;

  if v_was_post or not v_is_post then
    return new;
  end if;

  select * into a from public.audit_actor_info();
  if a.role = 'owner' then
    return new;
  end if;

  select id into v_owner_id
  from public.profiles
  where workshop_id = new.workshop_id and role = 'owner'
  order by created_at asc
  limit 1;

  if v_owner_id is null then
    return new;
  end if;

  select full_name into v_customer
  from public.customers where id = new.customer_id;

  select nullif(concat_ws(' ', make, model, plate), '') into v_vehicle
  from public.vehicles where id = new.vehicle_id;

  delete from public.notifications
  where type = 'case_status_change' and link = v_link;

  insert into public.notifications (owner_id, workshop_id, type, title, body, link)
  values (
    v_owner_id,
    new.workshop_id,
    'case_status_change',
    'Finitura auto completata, clicca per verificare',
    coalesce(v_customer, 'Cliente')
      || case when v_vehicle is not null then ' · ' || v_vehicle else '' end,
    v_link
  );

  return new;
end;
$$;
