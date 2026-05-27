-- ============================================================
-- RLS per fase su cases/documents + gate foto obbligatoria + lockdown fiscale.
--
-- Modello: owner/admin vedono e fanno tutto nel workshop. Un dipendente con
-- mansione (preparatore/verniciatore/finitore) vede e lavora SOLO le pratiche
-- nella sua fase (role_phase), e può solo spingerle alla fase successiva,
-- previa foto della fase completata. Tutto a livello DB (non solo UI).
-- ============================================================

-- ------------------------------------------------------------
-- CASES — visibilità e avanzamento per fase
-- ------------------------------------------------------------

drop policy if exists "cases_workshop_select" on public.cases;
create policy "cases_workshop_select" on public.cases for select
using (
  workshop_id = (select current_workshop_id())
  and (
    (select is_owner()) or (select is_admin())
    or status = public.role_phase((select current_user_role()))
  )
);

-- UPDATE: il dipendente parte dalla propria fase (USING) e può solo portare
-- la pratica alla fase successiva (WITH CHECK su next_phase). Owner/admin liberi.
drop policy if exists "cases_workshop_update" on public.cases;
create policy "cases_workshop_update" on public.cases for update
using (
  workshop_id = (select current_workshop_id())
  and (
    (select is_owner()) or (select is_admin())
    or status = public.role_phase((select current_user_role()))
  )
)
with check (
  workshop_id = (select current_workshop_id())
  and (
    (select is_owner()) or (select is_admin())
    or status = public.next_phase(public.role_phase((select current_user_role())))
  )
);

-- INSERT/DELETE pratiche: solo owner/admin (i dipendenti non creano/eliminano).
-- La creazione automatica lead→pratica gira in SECURITY DEFINER → bypassa RLS.
drop policy if exists "cases_workshop_insert" on public.cases;
create policy "cases_workshop_insert" on public.cases for insert
with check (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);

drop policy if exists "cases_workshop_delete" on public.cases;
create policy "cases_workshop_delete" on public.cases for delete
using (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);

-- ------------------------------------------------------------
-- TRIGGER gate: avanzamento valido + foto obbligatoria + timbro "fatto"
-- ------------------------------------------------------------
create or replace function public.enforce_case_phase_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  -- Owner/admin: nessun vincolo (mantengono il salvataggio combinato attuale).
  if public.is_owner() or public.is_admin() then
    return new;
  end if;

  v_role := public.current_user_role();

  if new.status is distinct from old.status then
    -- Deve partire dalla propria fase...
    if old.status is distinct from public.role_phase(v_role) then
      raise exception 'forbidden_phase';
    end if;
    -- ...e avanzare di esattamente un passo.
    if new.status is distinct from public.next_phase(old.status) then
      raise exception 'forbidden_phase';
    end if;
    -- Foto obbligatoria della fase che si sta completando.
    if not exists (
      select 1 from public.documents d
      where d.case_id = old.id
        and d.phase = old.status::text
        and d.mime_type like 'image/%'
    ) then
      raise exception 'photo_required';
    end if;
    -- Timbro del completamento (chi/quando).
    if old.status = 'preparazione' then
      new.preparazione_done_at := now();
      new.preparazione_done_by := auth.uid();
    elsif old.status = 'verniciatura' then
      new.verniciatura_done_at := now();
      new.verniciatura_done_by := auth.uid();
    elsif old.status = 'finitura' then
      new.finitura_done_at := now();
      new.finitura_done_by := auth.uid();
    end if;
  end if;

  -- Difesa: il dipendente non tocca campi gestionali/fiscali.
  new.price := old.price;
  new.description := old.description;
  new.customer_id := old.customer_id;
  new.vehicle_id := old.vehicle_id;
  new.insurance_company := old.insurance_company;
  new.archived_at := old.archived_at;
  new.archived_reason := old.archived_reason;

  return new;
end;
$$;

revoke execute on function public.enforce_case_phase_transition() from anon, authenticated;

drop trigger if exists trg_enforce_case_phase_transition on public.cases;
create trigger trg_enforce_case_phase_transition
  before update on public.cases
  for each row execute function public.enforce_case_phase_transition();

-- ------------------------------------------------------------
-- DOCUMENTS — foto leggibili/caricabili solo per la propria fase
-- ------------------------------------------------------------

drop policy if exists "documents_workshop_select" on public.documents;
create policy "documents_workshop_select" on public.documents for select
using (
  workshop_id = (select current_workshop_id())
  and (
    (select is_owner()) or (select is_admin())
    or exists (
      select 1 from public.cases c
      where c.id = documents.case_id
        and c.status = public.role_phase((select current_user_role()))
    )
  )
);

drop policy if exists "documents_workshop_insert" on public.documents;
create policy "documents_workshop_insert" on public.documents for insert
with check (
  workshop_id = (select current_workshop_id())
  and (
    (select is_owner()) or (select is_admin())
    or (
      documents.phase = public.role_phase((select current_user_role()))::text
      and exists (
        select 1 from public.cases c
        where c.id = documents.case_id
          and c.status = public.role_phase((select current_user_role()))
      )
    )
  )
);

-- UPDATE metadati documento: solo owner/admin.
drop policy if exists "documents_workshop_update" on public.documents;
create policy "documents_workshop_update" on public.documents for update
using (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
)
with check (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);

-- DELETE: owner/admin, oppure il dipendente può cancellare una propria foto
-- (uploaded_by) finché la pratica è nella sua fase (per correggere uno scatto).
drop policy if exists "documents_workshop_delete" on public.documents;
create policy "documents_workshop_delete" on public.documents for delete
using (
  workshop_id = (select current_workshop_id())
  and (
    (select is_owner()) or (select is_admin())
    or (
      uploaded_by = (select auth.uid())
      and exists (
        select 1 from public.cases c
        where c.id = documents.case_id
          and c.status = public.role_phase((select current_user_role()))
      )
    )
  )
);

-- ------------------------------------------------------------
-- LOCKDOWN FISCALE — fatture/preventivi solo owner/admin
-- ------------------------------------------------------------

drop policy if exists "invoices_workshop_select" on public.invoices;
create policy "invoices_workshop_select" on public.invoices for select
using (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);
drop policy if exists "invoices_workshop_insert" on public.invoices;
create policy "invoices_workshop_insert" on public.invoices for insert
with check (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);
drop policy if exists "invoices_workshop_update" on public.invoices;
create policy "invoices_workshop_update" on public.invoices for update
using (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
)
with check (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);
drop policy if exists "invoices_workshop_delete" on public.invoices;
create policy "invoices_workshop_delete" on public.invoices for delete
using (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);

drop policy if exists "invoice_items_workshop_select" on public.invoice_items;
create policy "invoice_items_workshop_select" on public.invoice_items for select
using (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);
drop policy if exists "invoice_items_workshop_insert" on public.invoice_items;
create policy "invoice_items_workshop_insert" on public.invoice_items for insert
with check (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);
drop policy if exists "invoice_items_workshop_update" on public.invoice_items;
create policy "invoice_items_workshop_update" on public.invoice_items for update
using (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
)
with check (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);
drop policy if exists "invoice_items_workshop_delete" on public.invoice_items;
create policy "invoice_items_workshop_delete" on public.invoice_items for delete
using (
  workshop_id = (select current_workshop_id())
  and ((select is_owner()) or (select is_admin()))
);
