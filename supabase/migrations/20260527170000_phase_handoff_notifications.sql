-- ============================================================
-- Notifiche di passaggio tra dipendenti (handoff di fase).
--
-- Quando una pratica entra in una fase, avvisa SOLO i dipendenti della mansione
-- competente (una notifica per ciascuno → la RLS owner_id = auth.uid() la mostra
-- solo a loro):
--   - → verniciatura  : tutti i verniciatori  "Preparazione completata, da verniciare"
--   - → finitura       : tutti i finitori      "Verniciatura completata, da rifinire"
--   - → controllo_titolare : il titolare       "Finitura completata, da controllare"
-- Il titolare riceve solo l'ultima (come già avviene). Su ogni cambio di stato
-- le notifiche di handoff pendenti per la pratica vengono ripulite.
--
-- Riscrive notify_finitura_done() mantenendo nome e trigger (trg_notify_finitura_done).
-- ============================================================

create or replace function public.notify_finitura_done()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_link text;
  v_customer text;
  v_vehicle text;
  v_body text;
  v_title text;
  v_target_role user_role;
  v_owner_id uuid;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  v_link := '/cases/' || new.id::text;

  -- Pulizia: rimuove le notifiche di handoff pendenti per questa pratica
  -- (la fase precedente è conclusa, qualunque essa fosse).
  delete from public.notifications
  where type = 'case_status_change' and link = v_link;

  -- Destinatario in base al nuovo stato.
  if new.status = 'verniciatura' then
    v_target_role := 'verniciatore';
    v_title := 'Preparazione completata, da verniciare';
  elsif new.status = 'finitura' then
    v_target_role := 'finitore';
    v_title := 'Verniciatura completata, da rifinire';
  elsif new.status = 'controllo_titolare' then
    v_target_role := null; -- destinatario: titolare
    v_title := 'Finitura completata, da controllare';
  else
    return new; -- altri stati: nessuna notifica (solo pulizia)
  end if;

  -- Contesto cliente/veicolo per il corpo della notifica.
  select full_name into v_customer from public.customers where id = new.customer_id;
  select nullif(concat_ws(' ', make, model, plate), '') into v_vehicle
  from public.vehicles where id = new.vehicle_id;
  v_body := coalesce(v_customer, 'Cliente')
    || case when v_vehicle is not null then ' · ' || v_vehicle else '' end;

  if v_target_role is null then
    -- Titolare: non notificare se è lui stesso ad aver mosso la pratica.
    select * into a from public.audit_actor_info();
    if a.role = 'owner' then
      return new;
    end if;
    select id into v_owner_id
    from public.profiles
    where workshop_id = new.workshop_id and role = 'owner'
    order by created_at asc
    limit 1;
    if v_owner_id is not null then
      insert into public.notifications (owner_id, workshop_id, type, title, body, link)
      values (v_owner_id, new.workshop_id, 'case_status_change', v_title, v_body, v_link);
    end if;
  else
    -- Dipendenti della mansione competente: una notifica ciascuno.
    insert into public.notifications (owner_id, workshop_id, type, title, body, link)
    select p.id, new.workshop_id, 'case_status_change', v_title, v_body, v_link
    from public.profiles p
    where p.workshop_id = new.workshop_id and p.role = v_target_role;
  end if;

  return new;
end;
$$;
