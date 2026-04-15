-- ============================================================
-- Fix 1: Allow approvers to update CRQ status on assigned CRQs
-- The existing policy only covers requester + admin, so when
-- an approver calls updateCRQStatus the update silently fails.
-- ============================================================

drop policy if exists "crqs: requester updates own, admin updates all" on public.crqs;

create policy "crqs: requester updates own, approver updates assigned, admin updates all"
  on public.crqs for update
  using (
    requester_id = auth.uid()
    or public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'approver'
      and public.is_crq_approver(id, auth.uid())
    )
  );

-- ============================================================
-- Fix 2: Security-definer function for checking all approvals
-- crq_approvers RLS only lets an approver see their own row,
-- so checkAllApproved() would return true prematurely when
-- there are multiple approvers.
-- ============================================================

create or replace function public.check_all_approved(p_crq_id uuid)
returns boolean
language sql security definer stable
as $$
  select coalesce(
    every(status = 'approved'),
    false
  )
  from public.crq_approvers
  where crq_id = p_crq_id;
$$;
