-- ============================================================
-- Fix: customers.lead_id deve essere ON DELETE SET NULL, non CASCADE
-- Quando elimino un lead, il customer collegato DEVE rimanere
-- (semantica: il cliente continua a esistere indipendentemente dal lead).
-- ============================================================

alter table public.customers
  drop constraint if exists customers_lead_id_fkey;

alter table public.customers
  add constraint customers_lead_id_fkey
  foreign key (lead_id) references public.leads(id)
  on delete set null;
