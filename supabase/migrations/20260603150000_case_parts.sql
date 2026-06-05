-- ============================================================
-- Sezione "Ricambi" sulla pratica. Lista di ricambi necessari, ognuno con una
-- spunta obbligatoria. Il finitore non può passare la pratica al titolare
-- (finitura → controllo_titolare) finché non sono tutti spuntati.
-- ============================================================

create table if not exists public.case_parts (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  name        text not null,
  quantity    int  not null default 1 check (quantity >= 1),
  checked_at  timestamptz,
  checked_by  uuid references auth.users(id) on delete set null,
  owner_id    uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists case_parts_case_idx on public.case_parts(case_id);
create index if not exists case_parts_workshop_idx on public.case_parts(workshop_id);

drop trigger if exists case_parts_set_owner on public.case_parts;
create trigger case_parts_set_owner
  before insert on public.case_parts
  for each row execute function public.set_owner_id();

alter table public.case_parts enable row level security;

drop policy if exists "case_parts_workshop_select" on public.case_parts;
create policy "case_parts_workshop_select" on public.case_parts for select
using (
  workshop_id = (select current_workshop_id())
  and (
    (select is_owner()) or (select is_admin())
    or exists (
      select 1 from public.cases c
      where c.id = case_parts.case_id
        and c.status = public.role_phase((select current_user_role()))
    )
  )
);

drop policy if exists "case_parts_workshop_insert" on public.case_parts;
create policy "case_parts_workshop_insert" on public.case_parts for insert
with check (
  workshop_id = (select current_workshop_id())
  and (
    (select is_owner()) or (select is_admin())
    or exists (
      select 1 from public.cases c
      where c.id = case_parts.case_id
        and c.status = public.role_phase((select current_user_role()))
    )
  )
);

drop policy if exists "case_parts_workshop_update" on public.case_parts;
create policy "case_parts_workshop_update" on public.case_parts for update
using (
  workshop_id = (select current_workshop_id())
  and (
    (select is_owner()) or (select is_admin())
    or exists (
      select 1 from public.cases c
      where c.id = case_parts.case_id
        and c.status = public.role_phase((select current_user_role()))
    )
  )
)
with check (workshop_id = (select current_workshop_id()));

drop policy if exists "case_parts_workshop_delete" on public.case_parts;
create policy "case_parts_workshop_delete" on public.case_parts for delete
using (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);

-- Gate finitura → controllo_titolare: tutti i ricambi devono essere spuntati.
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

  if not exists (
    select 1 from public.documents d
    where d.case_id = p_case_id
      and d.phase = v_case.status::text
      and d.mime_type like 'image/%'
  ) then
    raise exception 'photo_required';
  end if;

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

  -- Gate finitore: i ricambi devono essere tutti spuntati prima di mandare al titolare.
  if v_case.status = 'finitura' then
    if exists (
      select 1 from public.case_parts cp
      where cp.case_id = p_case_id and cp.checked_at is null
    ) then
      raise exception 'parts_unchecked';
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
