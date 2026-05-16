-- ============================================================
-- Admin audit log: traccia azioni admin sugli account officina
-- ============================================================

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_admin_idx
  on public.admin_audit_log(admin_id, created_at desc);
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log(target_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;

-- Solo admin possono leggere/scrivere
drop policy if exists "admin_audit_log_admin_only" on public.admin_audit_log;
create policy "admin_audit_log_admin_only"
  on public.admin_audit_log for all
  using ((select is_admin()))
  with check ((select is_admin()));
