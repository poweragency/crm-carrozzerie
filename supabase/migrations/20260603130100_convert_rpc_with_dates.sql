-- ============================================================
-- convert_lead_to_vehicle_customer: accetta data inizio e data scadenza pratica.
-- La signature cambia (nuovi parametri default null in coda → retro-compatibile a
-- livello di chiamata ma il client le passerà sempre). Il client valida che
-- p_due_at sia presente; qui è raise di sicurezza.
-- ============================================================

drop function if exists public.convert_lead_to_vehicle_customer(uuid, text, text, text, int, text, text, text);

create or replace function public.convert_lead_to_vehicle_customer(
  p_lead_id uuid,
  p_make text default null,
  p_model text default null,
  p_plate text default null,
  p_year int default null,
  p_color text default null,
  p_vin text default null,
  p_notes text default null,
  p_started_at date default null,
  p_due_at date default null
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
  if p_due_at is null then
    raise exception 'due_at_required';
  end if;

  update public.leads
     set status = 'cliente'
   where id = p_lead_id and status is distinct from 'cliente';

  select id into v_customer
  from public.customers
  where lead_id = p_lead_id and workshop_id = v_ws
  order by created_at desc
  limit 1;
  if v_customer is null then
    raise exception 'customer_not_created';
  end if;

  select id into v_case
  from public.cases
  where customer_id = v_customer and workshop_id = v_ws
  order by created_at desc
  limit 1;
  if v_case is null then
    raise exception 'case_not_created';
  end if;

  insert into public.vehicles (customer_id, make, model, plate, year, color, vin, notes)
  values (v_customer, p_make, p_model, p_plate, p_year, p_color, p_vin, p_notes)
  returning id into v_vehicle;

  -- Imposta veicolo e date sulla pratica.
  update public.cases
     set vehicle_id = v_vehicle,
         started_at = coalesce(p_started_at, started_at),
         due_at = p_due_at
   where id = v_case;

  return v_case;
end;
$$;

revoke execute on function public.convert_lead_to_vehicle_customer(uuid, text, text, text, int, text, text, text, date, date) from anon;
grant execute on function public.convert_lead_to_vehicle_customer(uuid, text, text, text, int, text, text, text, date, date) to authenticated;
