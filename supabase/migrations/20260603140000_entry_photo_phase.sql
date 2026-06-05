-- ============================================================
-- "Foto all'ingresso": nuova fase 'ingresso' nelle foto pratica.
-- Il preparatore deve caricarla PRIMA di poter passare la pratica a verniciatura
-- (gate aggiuntivo nella advance_case_phase RPC). Caricabile solo dal preparatore
-- (oltre a owner/admin).
-- ============================================================

-- 1) Estende il CHECK di documents.phase
alter table public.documents drop constraint if exists documents_phase_check;
alter table public.documents add constraint documents_phase_check
  check (phase in ('ingresso','preparazione','verniciatura','finitura'));

-- 2) Documents INSERT policy: il preparatore può caricare phase='ingresso' oltre alla
--    propria fase di competenza (preparazione).
drop policy if exists "documents_workshop_insert" on public.documents;
create policy "documents_workshop_insert" on public.documents for insert
with check (
  workshop_id = (select current_workshop_id())
  and (
    (select is_owner()) or (select is_admin())
    or (
      exists (
        select 1 from public.cases c
        where c.id = documents.case_id
          and c.status = public.role_phase((select current_user_role()))
      )
      and (
        documents.phase = public.role_phase((select current_user_role()))::text
        or (
          -- Eccezione: solo il preparatore può anche caricare la foto "all'ingresso".
          (select public.current_user_role()) = 'preparatore'
          and documents.phase = 'ingresso'
        )
      )
    )
  )
);

-- 3) advance_case_phase: gate aggiuntivo — quando il preparatore avanza
--    preparazione → verniciatura, serve sia la foto della fase preparazione
--    sia la foto all'ingresso.
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

  if not (public.is_owner() or public.is_admin()) then
    if v_case.status is distinct from public.role_phase(v_role) then
      raise exception 'forbidden_phase';
    end if;
  end if;

  v_next := public.next_phase(v_case.status);
  if v_next is null then
    raise exception 'not_advanceable';
  end if;

  -- Foto della fase corrente.
  if not exists (
    select 1 from public.documents d
    where d.case_id = p_case_id
      and d.phase = v_case.status::text
      and d.mime_type like 'image/%'
  ) then
    raise exception 'photo_required';
  end if;

  -- Foto all'ingresso obbligatoria quando il preparatore conclude la preparazione.
  if v_case.status = 'preparazione' then
    if not exists (
      select 1 from public.documents d
      where d.case_id = p_case_id
        and d.phase = 'ingresso'
        and d.mime_type like 'image/%'
    ) then
      raise exception 'entry_photo_required';
    end if;
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
