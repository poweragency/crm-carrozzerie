-- ============================================================
-- Annulla avanzamento fase: riporta una pratica alla fase precedente se è stata
-- inviata per sbaglio. Consentito solo se:
--   - la pratica è nella fase IMMEDIATAMENTE successiva a quella del dipendente
--     (cioè nessuno l'ha ancora fatta avanzare oltre)
--   - è stato il dipendente stesso a completarla (X_done_by = auth.uid())
--   - l'avanzamento è recente (entro 2 minuti) — finestra "annulla per sbaglio"
-- La UI mostra il tasto Annulla per 30s; il limite server (2 min) è un margine.
-- ============================================================

create or replace function public.undo_case_phase(p_case_id uuid)
returns public.cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role    user_role   := public.current_user_role();
  v_phase   case_status := public.role_phase(v_role);
  v_ws      uuid        := public.current_workshop_id();
  v_uid     uuid        := auth.uid();
  v_case    public.cases;
  v_done_at timestamptz;
  v_done_by uuid;
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;
  if v_phase is null then
    raise exception 'forbidden'; -- solo dipendenti con mansione
  end if;

  select * into v_case
  from public.cases
  where id = p_case_id and workshop_id = v_ws
  for update;
  if not found then
    raise exception 'case_not_found';
  end if;

  -- Deve trovarsi nella fase subito dopo la mia (non ancora presa in carico oltre).
  if v_case.status is distinct from public.next_phase(v_phase) then
    raise exception 'not_undoable';
  end if;

  -- Timbro della MIA fase.
  v_done_at := case v_phase
    when 'preparazione' then v_case.preparazione_done_at
    when 'verniciatura' then v_case.verniciatura_done_at
    when 'finitura'     then v_case.finitura_done_at
  end;
  v_done_by := case v_phase
    when 'preparazione' then v_case.preparazione_done_by
    when 'verniciatura' then v_case.verniciatura_done_by
    when 'finitura'     then v_case.finitura_done_by
  end;

  if v_done_by is distinct from v_uid then
    raise exception 'forbidden';
  end if;
  if v_done_at is null or v_done_at < now() - interval '2 minutes' then
    raise exception 'undo_expired';
  end if;

  -- Riporta indietro e azzera il timbro della mia fase.
  update public.cases
     set status = v_phase,
         preparazione_done_at = case when v_phase = 'preparazione' then null else preparazione_done_at end,
         preparazione_done_by = case when v_phase = 'preparazione' then null else preparazione_done_by end,
         verniciatura_done_at = case when v_phase = 'verniciatura' then null else verniciatura_done_at end,
         verniciatura_done_by = case when v_phase = 'verniciatura' then null else verniciatura_done_by end,
         finitura_done_at     = case when v_phase = 'finitura'     then null else finitura_done_at end,
         finitura_done_by      = case when v_phase = 'finitura'     then null else finitura_done_by end
   where id = p_case_id
   returning * into v_case;

  return v_case;
end;
$$;

revoke execute on function public.undo_case_phase(uuid) from anon;
grant execute on function public.undo_case_phase(uuid) to authenticated;
