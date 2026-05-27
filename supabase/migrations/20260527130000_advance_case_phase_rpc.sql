-- ============================================================
-- Fix avanzamento fase: RPC SECURITY DEFINER al posto dell'UPDATE diretto.
--
-- Problema: l'avanzamento porta la pratica a una fase che NON è più quella del
-- dipendente. L'UPDATE diretto sotto RLS è fragile sulle transizioni di stato
-- (WITH CHECK sul nuovo stato + il .select() post-update rilegge una riga ormai
-- invisibile al dipendente) → "new row violates row-level security policy".
--
-- Soluzione: l'avanzamento passa SOLO per advance_case_phase() (SECURITY
-- DEFINER, bypassa l'RLS perché posseduta da postgres che è owner di cases).
-- La funzione valida ruolo↔fase + foto obbligatoria, avanza e timbra il "fatto".
-- I dipendenti non aggiornano più cases direttamente (UPDATE solo owner/admin).
-- ============================================================

create or replace function public.advance_case_phase(p_case_id uuid)
returns public.cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role  user_role  := public.current_user_role();
  v_ws    uuid       := public.current_workshop_id();
  v_uid   uuid       := auth.uid();
  v_case  public.cases;
  v_next  case_status;
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  select * into v_case
  from public.cases
  where id = p_case_id and workshop_id = v_ws
  for update;
  if not found then
    raise exception 'case_not_found';
  end if;

  -- Autorizzazione: owner/admin sempre; dipendente solo sulla propria fase.
  if not (public.is_owner() or public.is_admin()) then
    if v_case.status is distinct from public.role_phase(v_role) then
      raise exception 'forbidden_phase';
    end if;
  end if;

  v_next := public.next_phase(v_case.status);
  if v_next is null then
    raise exception 'not_advanceable';
  end if;

  -- Foto obbligatoria della fase che si sta completando.
  if not exists (
    select 1 from public.documents d
    where d.case_id = p_case_id
      and d.phase = v_case.status::text
      and d.mime_type like 'image/%'
  ) then
    raise exception 'photo_required';
  end if;

  update public.cases
     set status = v_next,
         preparazione_done_at = case when v_case.status = 'preparazione' then now() else preparazione_done_at end,
         preparazione_done_by = case when v_case.status = 'preparazione' then v_uid else preparazione_done_by end,
         verniciatura_done_at = case when v_case.status = 'verniciatura' then now() else verniciatura_done_at end,
         verniciatura_done_by = case when v_case.status = 'verniciatura' then v_uid else verniciatura_done_by end,
         finitura_done_at     = case when v_case.status = 'finitura'     then now() else finitura_done_at end,
         finitura_done_by      = case when v_case.status = 'finitura'     then v_uid else finitura_done_by end
   where id = p_case_id
   returning * into v_case;

  return v_case;
end;
$$;

revoke execute on function public.advance_case_phase(uuid) from anon;
grant execute on function public.advance_case_phase(uuid) to authenticated;

-- L'avanzamento ora passa per la RPC: niente più trigger di enforcement né
-- UPDATE diretto da parte dei dipendenti.
drop trigger if exists trg_enforce_case_phase_transition on public.cases;
drop function if exists public.enforce_case_phase_transition();

drop policy if exists "cases_workshop_update" on public.cases;
create policy "cases_workshop_update" on public.cases for update
using (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
)
with check (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);
