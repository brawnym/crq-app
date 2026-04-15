-- ============================================================
-- Security-definer function to return active approvers
-- Bypasses RLS so any authenticated user (requester, approver,
-- admin) can fetch the approver list when creating a CRQ.
-- ============================================================

create or replace function public.get_active_approvers()
returns table (
  id          uuid,
  full_name   text,
  email       text,
  role        public.user_role,
  is_active   boolean,
  created_at  timestamptz
)
language sql security definer stable
as $$
  select id, full_name, email, role, is_active, created_at
  from public.users
  where role = 'approver'
    and is_active = true
  order by full_name;
$$;
