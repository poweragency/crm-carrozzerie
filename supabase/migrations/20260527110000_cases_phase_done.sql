-- ============================================================
-- Helper ruolo→fase + colonne di completamento fase ("check") su cases.
--
-- File separato da 20260527100000: i literal dei nuovi valori enum
-- (es. 'preparatore') sono usabili solo dopo il commit della transazione
-- che ha creato il tipo. Qui M1 è già committata.
-- ============================================================

-- Ruolo dell'utente corrente (specchio di is_owner()).
create or replace function public.current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke execute on function public.current_user_role() from anon;
grant execute on function public.current_user_role() to authenticated;

-- Mappa mansione → fase di produzione di competenza.
create or replace function public.role_phase(p_role user_role)
returns case_status
language sql
immutable
set search_path = public
as $$
  select case p_role
    when 'preparatore'  then 'preparazione'::case_status
    when 'verniciatore' then 'verniciatura'::case_status
    when 'finitore'     then 'finitura'::case_status
    else null::case_status
  end
$$;

grant execute on function public.role_phase(user_role) to authenticated;

-- Fase successiva nel flusso di produzione (oltre la finitura → completata,
-- da cui prende in carico il titolare). Stati post-produzione → null.
create or replace function public.next_phase(p_status case_status)
returns case_status
language sql
immutable
set search_path = public
as $$
  select case p_status
    when 'preparazione' then 'verniciatura'::case_status
    when 'verniciatura' then 'finitura'::case_status
    when 'finitura'     then 'completata'::case_status
    else null::case_status
  end
$$;

grant execute on function public.next_phase(case_status) to authenticated;

-- Colonne "check" per fase: quando e da chi è stata completata.
alter table public.cases
  add column if not exists preparazione_done_at timestamptz,
  add column if not exists preparazione_done_by uuid references auth.users(id) on delete set null,
  add column if not exists verniciatura_done_at timestamptz,
  add column if not exists verniciatura_done_by uuid references auth.users(id) on delete set null,
  add column if not exists finitura_done_at     timestamptz,
  add column if not exists finitura_done_by      uuid references auth.users(id) on delete set null;
