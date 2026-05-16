-- ============================================================
-- Fix: i membri di un workshop devono potersi vedere tra loro.
-- Prima: profiles_select_self_or_admin → solo il proprio profilo + admin.
-- Ora: tutti i profili dello stesso workshop sono visibili (utile per
-- la pagina /team dove l'owner deve listare i propri staff).
-- ============================================================

drop policy if exists "profiles_select_self_or_admin" on public.profiles;

create policy "profiles_select_workshop_or_admin"
  on public.profiles for select
  using (
    workshop_id = (select current_workshop_id())
    or (select is_admin())
  );
