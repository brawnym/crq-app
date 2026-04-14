-- ============================================================
-- RLS Policies
-- ============================================================

-- Helper: get current user's role without recursive RLS
create or replace function public.get_my_role()
returns text
language sql security definer stable
as $$
  select role::text from public.users where id = auth.uid();
$$;

-- ── USERS ────────────────────────────────────────────────────
alter table public.users enable row level security;

create policy "users: read own or admin reads all"
  on public.users for select
  using (id = auth.uid() or public.get_my_role() = 'admin');

create policy "users: admin insert"
  on public.users for insert
  with check (public.get_my_role() = 'admin');

create policy "users: admin update"
  on public.users for update
  using (public.get_my_role() = 'admin');

-- ── PROJECTS ─────────────────────────────────────────────────
alter table public.projects enable row level security;

create policy "projects: all authenticated can read active"
  on public.projects for select
  using (is_active = true or public.get_my_role() = 'admin');

create policy "projects: admin insert"
  on public.projects for insert
  with check (public.get_my_role() = 'admin');

create policy "projects: admin update"
  on public.projects for update
  using (public.get_my_role() = 'admin');

-- ── CRQS ─────────────────────────────────────────────────────
alter table public.crqs enable row level security;

create policy "crqs: requester reads own, approver reads assigned, admin reads all"
  on public.crqs for select
  using (
    requester_id = auth.uid()
    or public.get_my_role() = 'admin'
    or (
      public.get_my_role() = 'approver'
      and exists (
        select 1 from public.crq_approvers
        where crq_id = crqs.id and approver_id = auth.uid()
      )
    )
  );

create policy "crqs: requester or admin insert"
  on public.crqs for insert
  with check (
    requester_id = auth.uid() or public.get_my_role() = 'admin'
  );

create policy "crqs: requester updates own, admin updates all"
  on public.crqs for update
  using (
    requester_id = auth.uid() or public.get_my_role() = 'admin'
  );

-- ── CRQ_APPROVERS ────────────────────────────────────────────
alter table public.crq_approvers enable row level security;

create policy "crq_approvers: select"
  on public.crq_approvers for select
  using (
    approver_id = auth.uid()
    or public.get_my_role() = 'admin'
    or exists (
      select 1 from public.crqs
      where id = crq_approvers.crq_id and requester_id = auth.uid()
    )
  );

create policy "crq_approvers: insert by requester or admin"
  on public.crq_approvers for insert
  with check (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.crqs
      where id = crq_approvers.crq_id and requester_id = auth.uid()
    )
  );

create policy "crq_approvers: approver updates own row"
  on public.crq_approvers for update
  using (
    approver_id = auth.uid() or public.get_my_role() = 'admin'
  );

-- ── AUDIT_TRAIL ──────────────────────────────────────────────
alter table public.audit_trail enable row level security;

create policy "audit_trail: select"
  on public.audit_trail for select
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.crqs
      where id = audit_trail.crq_id
        and (
          requester_id = auth.uid()
          or exists (
            select 1 from public.crq_approvers
            where crq_id = audit_trail.crq_id and approver_id = auth.uid()
          )
        )
    )
  );

create policy "audit_trail: insert by authenticated"
  on public.audit_trail for insert
  with check (actor_id = auth.uid());

-- ── FOLLOW_UPS ───────────────────────────────────────────────
alter table public.follow_ups enable row level security;

create policy "follow_ups: select"
  on public.follow_ups for select
  using (
    sender_id = auth.uid()
    or recipient_id = auth.uid()
    or public.get_my_role() = 'admin'
  );

create policy "follow_ups: insert by requester"
  on public.follow_ups for insert
  with check (sender_id = auth.uid());
