-- ============================================================
-- Fix RLS infinite recursion: crq_approvers ↔ crqs
--
-- Root cause:
--   crqs SELECT policy          → queries crq_approvers (to check approver access)
--   crq_approvers SELECT policy → queries crqs (to check requester access)
--   crq_approvers INSERT policy → queries crqs (to check requester access)
--   audit_trail SELECT policy   → queries crq_approvers (via crqs subquery)
--   → circular RLS evaluation → infinite recursion
--
-- Fix: security definer helper functions bypass RLS when reading the other
--      table, breaking the cycle.
-- ============================================================

-- Helper: is user an approver on a given CRQ? (bypasses RLS on crq_approvers)
create or replace function public.is_crq_approver(p_crq_id uuid, p_user_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.crq_approvers
    where crq_id = p_crq_id and approver_id = p_user_id
  );
$$;

-- Helper: is user the requester of a given CRQ? (bypasses RLS on crqs)
create or replace function public.is_crq_requester(p_crq_id uuid, p_user_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.crqs
    where id = p_crq_id and requester_id = p_user_id
  );
$$;

-- Drop the four circular policies
drop policy if exists "crqs: requester reads own, approver reads assigned, admin reads all" on public.crqs;
drop policy if exists "crq_approvers: select"                    on public.crq_approvers;
drop policy if exists "crq_approvers: insert by requester or admin" on public.crq_approvers;
drop policy if exists "audit_trail: select"                      on public.audit_trail;

-- crqs SELECT: replace direct subquery on crq_approvers with is_crq_approver()
create policy "crqs: requester reads own, approver reads assigned, admin reads all"
  on public.crqs for select
  using (
    requester_id = auth.uid()
    or public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'approver'
      and public.is_crq_approver(crqs.id, auth.uid())
    )
  );

-- crq_approvers SELECT: replace direct subquery on crqs with is_crq_requester()
create policy "crq_approvers: select"
  on public.crq_approvers for select
  using (
    approver_id = auth.uid()
    or public.get_my_role() = 'admin'
    or public.is_crq_requester(crq_approvers.crq_id, auth.uid())
  );

-- crq_approvers INSERT: replace direct subquery on crqs with is_crq_requester()
create policy "crq_approvers: insert by requester or admin"
  on public.crq_approvers for insert
  with check (
    public.get_my_role() = 'admin'
    or public.is_crq_requester(crq_approvers.crq_id, auth.uid())
  );

-- audit_trail SELECT: replace direct subquery on crq_approvers with is_crq_approver()
create policy "audit_trail: select"
  on public.audit_trail for select
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.crqs
      where id = audit_trail.crq_id
        and (
          requester_id = auth.uid()
          or public.is_crq_approver(audit_trail.crq_id, auth.uid())
        )
    )
  );
