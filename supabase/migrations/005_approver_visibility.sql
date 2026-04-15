-- ============================================================
-- Allow all authenticated users to read active approvers
-- Requesters need to see the approver list when creating CRQs,
-- but the current policy only lets users see their own row.
-- ============================================================

drop policy if exists "users: read own or admin reads all" on public.users;

create policy "users: read own or admin reads all"
  on public.users for select
  using (
    id = auth.uid()
    or public.get_my_role() = 'admin'
    or (role = 'approver' and is_active = true)
  );
