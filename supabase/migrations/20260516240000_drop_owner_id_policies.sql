-- ============================================================
-- Step 3/5 cleanup — Drop le RLS policy owner_id-based.
-- Da ora la sicurezza è solo workshop_id-based.
--
-- Le COLONNE owner_id restano (utili come audit "chi ha creato",
-- e per Step 5 — workshop_audit_log).
-- ============================================================

-- LEADS
drop policy if exists "leads_owner_select" on public.leads;
drop policy if exists "leads_owner_insert" on public.leads;
drop policy if exists "leads_owner_update" on public.leads;
drop policy if exists "leads_owner_delete" on public.leads;

-- CUSTOMERS
drop policy if exists "customers_owner_select" on public.customers;
drop policy if exists "customers_owner_insert" on public.customers;
drop policy if exists "customers_owner_update" on public.customers;
drop policy if exists "customers_owner_delete" on public.customers;

-- CASES
drop policy if exists "cases_owner_select" on public.cases;
drop policy if exists "cases_owner_insert" on public.cases;
drop policy if exists "cases_owner_update" on public.cases;
drop policy if exists "cases_owner_delete" on public.cases;

-- DOCUMENTS
drop policy if exists "documents_owner_select" on public.documents;
drop policy if exists "documents_owner_insert" on public.documents;
drop policy if exists "documents_owner_update" on public.documents;
drop policy if exists "documents_owner_delete" on public.documents;

-- NOTES
drop policy if exists "notes_owner_select" on public.notes;
drop policy if exists "notes_owner_insert" on public.notes;
drop policy if exists "notes_owner_update" on public.notes;
drop policy if exists "notes_owner_delete" on public.notes;

-- VEHICLES
drop policy if exists "vehicles_owner_select" on public.vehicles;
drop policy if exists "vehicles_owner_insert" on public.vehicles;
drop policy if exists "vehicles_owner_update" on public.vehicles;
drop policy if exists "vehicles_owner_delete" on public.vehicles;

-- APPOINTMENTS
drop policy if exists "appointments_owner_select" on public.appointments;
drop policy if exists "appointments_owner_insert" on public.appointments;
drop policy if exists "appointments_owner_update" on public.appointments;
drop policy if exists "appointments_owner_delete" on public.appointments;

-- INVOICES
drop policy if exists "invoices_owner_select" on public.invoices;
drop policy if exists "invoices_owner_insert" on public.invoices;
drop policy if exists "invoices_owner_update" on public.invoices;
drop policy if exists "invoices_owner_delete" on public.invoices;

-- INVOICE_ITEMS
drop policy if exists "invoice_items_owner_select" on public.invoice_items;
drop policy if exists "invoice_items_owner_insert" on public.invoice_items;
drop policy if exists "invoice_items_owner_update" on public.invoice_items;
drop policy if exists "invoice_items_owner_delete" on public.invoice_items;

-- NOTIFICATIONS — manteniamo le policy owner_id (la notifica è per-utente,
-- ogni user vede SOLO le sue notifiche anche se nello stesso workshop).
-- Le _workshop_ policy aggiunte in Step 2 garantiscono anche l'isolamento
-- tra workshop diversi.
