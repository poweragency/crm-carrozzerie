-- ============================================================
-- Conversione lead → cliente con dati veicolo OBBLIGATORI, atomica.
--
-- Prima: spostare un lead in "cliente" (trigger handle_lead_to_customer) creava
-- cliente + pratica VUOTA, senza veicolo. Ora il passaggio a cliente avviene
-- solo dalla pipeline tramite un modale che raccoglie i dati della vettura, e
-- l'intera operazione (lead→cliente, creazione cliente+pratica via trigger,
-- veicolo, collegamento pratica↔veicolo) gira in UNA transazione: se qualcosa
-- fallisce, rollback totale → niente cliente/pratica orfani.
-- ============================================================

create or replace function public.convert_lead_to_vehicle_customer(
  p_lead_id uuid,
  p_make text default null,
  p_model text default null,
  p_plate text default null,
  p_year int default null,
  p_color text default null,
  p_vin text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws       uuid := public.current_workshop_id();
  v_customer uuid;
  v_case     uuid;
  v_vehicle  uuid;
begin
  if v_ws is null then
    raise exception 'unauthenticated';
  end if;
  if not (public.is_owner() or public.is_admin()) then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.leads where id = p_lead_id and workshop_id = v_ws) then
    raise exception 'lead_not_found';
  end if;

  -- 1) lead → cliente: il trigger handle_lead_to_customer crea cliente + pratica.
  update public.leads
     set status = 'cliente'
   where id = p_lead_id and status is distinct from 'cliente';

  -- 2) cliente creato dal trigger (stesso workshop)
  select id into v_customer
  from public.customers
  where lead_id = p_lead_id and workshop_id = v_ws
  order by created_at desc
  limit 1;
  if v_customer is null then
    raise exception 'customer_not_created';
  end if;

  -- 3) pratica creata dal trigger
  select id into v_case
  from public.cases
  where customer_id = v_customer and workshop_id = v_ws
  order by created_at desc
  limit 1;
  if v_case is null then
    raise exception 'case_not_created';
  end if;

  -- 4) veicolo (workshop_id popolato dal trigger set_owner_id)
  insert into public.vehicles (customer_id, make, model, plate, year, color, vin, notes)
  values (v_customer, p_make, p_model, p_plate, p_year, p_color, p_vin, p_notes)
  returning id into v_vehicle;

  -- 5) collega la pratica al veicolo
  update public.cases set vehicle_id = v_vehicle where id = v_case;

  return v_case;
end;
$$;

revoke execute on function public.convert_lead_to_vehicle_customer(uuid, text, text, text, int, text, text, text) from anon;
grant execute on function public.convert_lead_to_vehicle_customer(uuid, text, text, text, int, text, text, text) to authenticated;
