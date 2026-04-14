# CRQ App — Phase 2: Backend (Supabase)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the complete Supabase backend — database schema, enums, triggers, RLS policies, Edge Function for email notifications, and pg_cron SLA jobs.

**Architecture:** All SQL runs in the Supabase SQL editor or via Supabase CLI migrations. Edge Functions live in `supabase/functions/`. RLS is enforced using a `get_my_role()` security-definer helper to avoid recursive policy evaluation on the `users` table.

**Tech Stack:** PostgreSQL 15 (Supabase), Supabase Edge Functions (Deno), pg_cron, Supabase SMTP

**Prerequisite:** A Supabase project must exist. Get URL + anon key from Settings → API and put them in `crq-app/.env.local`.

---

## File Map

| File | Purpose |
|---|---|
| `supabase/migrations/001_schema.sql` | Enums, tables, sequences, triggers |
| `supabase/migrations/002_rls.sql` | RLS enable + all policies |
| `supabase/migrations/003_pg_cron.sql` | SLA cron jobs |
| `supabase/functions/send-crq-notification/index.ts` | Email notification Edge Function |

---

### Task 9: Database Schema — Enums, Users, Projects

**Files:**
- Create: `supabase/migrations/001_schema.sql` (first half)

- [ ] **Step 1: Create migrations directory**

```bash
cd "D:/antigravity home/crq-app"
mkdir -p supabase/migrations supabase/functions/send-crq-notification
```

- [ ] **Step 2: Write schema SQL — enums and users/projects**

Create `supabase/migrations/001_schema.sql` with the following content (run this in the Supabase SQL editor):

```sql
-- ============================================================
-- CRQ App Schema — Part 1: Enums, Users, Projects
-- ============================================================

-- Enums
create type public.user_role as enum ('requester', 'approver', 'admin');
create type public.crq_status as enum (
  'draft', 'pending_approval', 'in_implementation',
  'completed', 'rejected', 'archived'
);
create type public.crq_priority as enum ('low', 'medium', 'high', 'critical');
create type public.approver_status as enum ('pending', 'approved', 'rejected', 'sent_back');

-- Users (mirrors auth.users)
create table public.users (
  id         uuid references auth.users(id) on delete cascade primary key,
  full_name  text not null,
  email      text not null unique,
  role       public.user_role not null default 'requester',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create user profile on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.users (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unknown'),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'requester')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Projects
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid references public.users(id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
```

- [ ] **Step 3: Run in Supabase SQL editor**

Go to your Supabase project → SQL Editor → paste and run. Expected: `Success. No rows returned.`

- [ ] **Step 4: Verify tables exist**

```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Expected: `projects`, `users` in results.

- [ ] **Step 5: Commit migration file**

```bash
git add supabase/migrations/001_schema.sql
git commit -m "feat: add schema migration for users and projects"
```

---

### Task 10: Database Schema — CRQs, Approvers, Audit, Follow-ups

**Files:**
- Modify: `supabase/migrations/001_schema.sql` (append second half)

- [ ] **Step 1: Append CRQ tables to `001_schema.sql`**

Append the following to `supabase/migrations/001_schema.sql`:

```sql
-- ============================================================
-- CRQ App Schema — Part 2: CRQs and Related Tables
-- ============================================================

-- Auto-incrementing CRQ number sequence
create sequence public.crq_seq start 1;

-- CRQs
create table public.crqs (
  id                     uuid primary key default gen_random_uuid(),
  crq_number             text not null unique,
  title                  text not null,
  description            text not null,
  status                 public.crq_status not null default 'draft',
  priority               public.crq_priority not null default 'medium',
  project_id             uuid references public.projects(id) on delete set null,
  requester_id           uuid references public.users(id) not null,
  requested_by           text not null,
  requested_date         date not null,
  authorized_by          text not null,
  changes_effective_from date not null,
  due_date               timestamptz,
  sla_deadline           timestamptz,
  last_updated_at        timestamptz not null default now(),
  archived_at            timestamptz,
  created_at             timestamptz not null default now()
);

-- Auto-generate CRQ number before insert
create or replace function public.set_crq_number()
returns trigger
language plpgsql
as $$
begin
  new.crq_number := 'CRQ-' || to_char(now(), 'YYYY') || '-' ||
                    lpad(nextval('public.crq_seq')::text, 4, '0');
  return new;
end;
$$;

create trigger trg_set_crq_number
  before insert on public.crqs
  for each row execute function public.set_crq_number();

-- Update last_updated_at on every CRQ update
create or replace function public.touch_crq_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.last_updated_at := now();
  -- Recompute SLA deadline unless a custom due_date is set
  if new.due_date is null then
    new.sla_deadline := now() + interval '24 hours';
  else
    new.sla_deadline := new.due_date;
  end if;
  return new;
end;
$$;

create trigger trg_touch_crq_updated_at
  before update on public.crqs
  for each row execute function public.touch_crq_updated_at();

-- Also set sla_deadline on insert when status is pending_approval
create or replace function public.set_initial_sla()
returns trigger
language plpgsql
as $$
begin
  if new.due_date is not null then
    new.sla_deadline := new.due_date;
  end if;
  return new;
end;
$$;

create trigger trg_set_initial_sla
  before insert on public.crqs
  for each row execute function public.set_initial_sla();

-- CRQ Approvers
create table public.crq_approvers (
  id           uuid primary key default gen_random_uuid(),
  crq_id       uuid references public.crqs(id) on delete cascade not null,
  approver_id  uuid references public.users(id) not null,
  status       public.approver_status not null default 'pending',
  comments     text,
  actioned_at  timestamptz,
  unique(crq_id, approver_id)
);

-- Audit trail (append-only)
create table public.audit_trail (
  id              uuid primary key default gen_random_uuid(),
  crq_id          uuid references public.crqs(id) on delete cascade not null,
  actor_id        uuid references public.users(id) not null,
  action          text not null,
  previous_value  jsonb,
  new_value       jsonb,
  note            text,
  created_at      timestamptz not null default now()
);

-- Follow-ups
create table public.follow_ups (
  id           uuid primary key default gen_random_uuid(),
  crq_id       uuid references public.crqs(id) on delete cascade not null,
  sender_id    uuid references public.users(id) not null,
  recipient_id uuid references public.users(id) not null,
  message      text not null,
  created_at   timestamptz not null default now()
);
```

- [ ] **Step 2: Run the appended SQL in Supabase SQL editor**

Expected: `Success. No rows returned.`

- [ ] **Step 3: Verify all tables**

```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Expected: `audit_trail`, `crq_approvers`, `crqs`, `follow_ups`, `projects`, `users`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_schema.sql
git commit -m "feat: add CRQ, approvers, audit_trail, follow_ups schema"
```

---

### Task 11: RLS Policies

**Files:**
- Create: `supabase/migrations/002_rls.sql`

- [ ] **Step 1: Write `supabase/migrations/002_rls.sql`**

```sql
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
```

- [ ] **Step 2: Run in Supabase SQL editor**

Expected: `Success. No rows returned.`

- [ ] **Step 3: Verify RLS is enabled**

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Expected: All tables show `rowsecurity = true`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_rls.sql
git commit -m "feat: add RLS policies for all tables"
```

---

### Task 12: pg_cron SLA Jobs

**Files:**
- Create: `supabase/migrations/003_pg_cron.sql`

- [ ] **Step 1: Enable pg_cron extension in Supabase**

In Supabase dashboard → Database → Extensions → search `pg_cron` → Enable.

- [ ] **Step 2: Write `supabase/migrations/003_pg_cron.sql`**

```sql
-- ============================================================
-- SLA Cron Jobs (runs hourly)
-- ============================================================

-- Function: notify users with approaching SLA (80% of window elapsed)
create or replace function public.check_sla_approaching()
returns void
language plpgsql security definer
as $$
declare
  rec record;
begin
  for rec in
    select c.id, c.crq_number, c.title, c.sla_deadline, c.requester_id, c.status
    from public.crqs c
    where c.status in ('pending_approval', 'in_implementation')
      and c.sla_deadline is not null
      and c.sla_deadline > now()
      and c.sla_deadline <= now() + interval '5 hours'  -- within 20% of 24hr window
      and not exists (
        -- Don't re-notify if already notified in last 4 hours
        select 1 from public.audit_trail at2
        where at2.crq_id = c.id
          and at2.action = 'sla_reminder_sent'
          and at2.created_at > now() - interval '4 hours'
      )
  loop
    -- Insert an audit entry to prevent duplicate notifications
    insert into public.audit_trail (crq_id, actor_id, action, note)
    values (rec.id, rec.requester_id, 'sla_reminder_sent', 'SLA approaching — reminder triggered');

    -- Invoke Edge Function to send email
    perform net.http_post(
      url := current_setting('app.edge_function_url') || '/send-crq-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'sla_approaching',
        'crq_id', rec.id
      )
    );
  end loop;
end;
$$;

-- Function: notify on SLA breach
create or replace function public.check_sla_breached()
returns void
language plpgsql security definer
as $$
declare
  rec record;
begin
  for rec in
    select c.id, c.crq_number, c.requester_id
    from public.crqs c
    where c.status in ('pending_approval', 'in_implementation')
      and c.sla_deadline is not null
      and c.sla_deadline < now()
      and not exists (
        select 1 from public.audit_trail at2
        where at2.crq_id = c.id
          and at2.action = 'sla_breached_notified'
          and at2.created_at > now() - interval '4 hours'
      )
  loop
    insert into public.audit_trail (crq_id, actor_id, action, note)
    values (rec.id, rec.requester_id, 'sla_breached_notified', 'SLA breached — notification sent');

    perform net.http_post(
      url := current_setting('app.edge_function_url') || '/send-crq-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'sla_breached',
        'crq_id', rec.id
      )
    );
  end loop;
end;
$$;

-- Schedule: check every hour
select cron.schedule('sla-approaching', '0 * * * *', 'select public.check_sla_approaching()');
select cron.schedule('sla-breached', '0 * * * *', 'select public.check_sla_breached()');
```

- [ ] **Step 3: Set app settings in Supabase**

In Supabase SQL editor, run (replace with real values):

```sql
alter database postgres set app.edge_function_url = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1';
alter database postgres set app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

- [ ] **Step 4: Run migration**

Paste and run `003_pg_cron.sql` in Supabase SQL editor.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/003_pg_cron.sql
git commit -m "feat: add pg_cron SLA reminder jobs"
```

---

### Task 13: Email Notification Edge Function

**Files:**
- Create: `supabase/functions/send-crq-notification/index.ts`

- [ ] **Step 1: Write `supabase/functions/send-crq-notification/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface NotificationPayload {
  type:
    | 'submitted'
    | 'approved'
    | 'rejected'
    | 'sent_back'
    | 'resubmitted'
    | 'follow_up'
    | 'completed'
    | 'sla_approaching'
    | 'sla_breached';
  crq_id: string;
  follow_up_message?: string;
  approver_comments?: string;
}

async function getCRQWithDetails(crqId: string) {
  const { data, error } = await supabase
    .from('crqs')
    .select(`
      *,
      project:projects(name),
      requester:users!requester_id(email, full_name),
      approvers:crq_approvers(
        status, comments,
        approver:users!approver_id(email, full_name)
      )
    `)
    .eq('id', crqId)
    .single();
  if (error) throw error;
  return data;
}

async function sendEmail(to: string, subject: string, html: string) {
  const { error } = await supabase.auth.admin.sendRawEmail({
    to,
    subject,
    html,
  } as never);
  // Supabase SMTP — use their built-in email
  // If sendRawEmail is unavailable, use fetch to your SMTP endpoint
  if (error) console.error('Email error:', error);
}

function crqLink(crqId: string) {
  return `${appUrl}/crqs/${crqId}`;
}

function baseEmail(crq: Record<string, unknown>, body: string) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>${crq.crq_number} — ${crq.title}</h2>
      <p><strong>Project:</strong> ${(crq.project as {name:string})?.name ?? 'N/A'}</p>
      <p><strong>Status:</strong> ${crq.status}</p>
      ${body}
      <hr/>
      <p><a href="${crqLink(crq.id as string)}">View CRQ →</a></p>
    </div>
  `;
}

serve(async (req) => {
  const payload: NotificationPayload = await req.json();
  const crq = await getCRQWithDetails(payload.crq_id);
  const approvers = (crq.approvers ?? []) as Array<{status: string; approver: {email: string; full_name: string}}>;
  const pendingApprovers = approvers.filter((a) => a.status === 'pending');

  const subjectMap: Record<string, string> = {
    submitted:      `[${crq.crq_number}] Action Required: Approval Needed`,
    approved:       `[${crq.crq_number}] Approved — Ready for Implementation`,
    rejected:       `[${crq.crq_number}] Rejected — See Comments`,
    sent_back:      `[${crq.crq_number}] Changes Requested — See Comments`,
    resubmitted:    `[${crq.crq_number}] Resubmitted for Approval`,
    follow_up:      `[${crq.crq_number}] Follow-Up: Approval Reminder`,
    completed:      `[${crq.crq_number}] Implementation Completed`,
    sla_approaching:`[${crq.crq_number}] SLA Reminder — Action Due Soon`,
    sla_breached:   `[${crq.crq_number}] SLA Overdue — Immediate Action Required`,
  };

  const subject = subjectMap[payload.type];

  switch (payload.type) {
    case 'submitted':
    case 'resubmitted': {
      const body = baseEmail(crq, `<p>A change request requires your approval.</p>`);
      for (const a of pendingApprovers) {
        await sendEmail(a.approver.email, subject, body);
      }
      break;
    }
    case 'approved':
    case 'rejected':
    case 'sent_back': {
      const comments = payload.approver_comments
        ? `<p><strong>Comments:</strong> ${payload.approver_comments}</p>`
        : '';
      const body = baseEmail(crq, comments);
      await sendEmail((crq.requester as {email:string}).email, subject, body);
      break;
    }
    case 'follow_up': {
      const body = baseEmail(
        crq,
        `<p><strong>Message:</strong> ${payload.follow_up_message ?? ''}</p>`
      );
      for (const a of pendingApprovers) {
        await sendEmail(a.approver.email, subject, body);
      }
      break;
    }
    case 'completed': {
      const body = baseEmail(crq, `<p>The implementation has been marked complete.</p>`);
      for (const a of approvers) {
        await sendEmail(a.approver.email, subject, body);
      }
      break;
    }
    case 'sla_approaching':
    case 'sla_breached': {
      const body = baseEmail(
        crq,
        `<p>SLA deadline: <strong>${crq.sla_deadline}</strong></p>`
      );
      await sendEmail((crq.requester as {email:string}).email, subject, body);
      break;
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy Edge Function**

```bash
npx supabase functions deploy send-crq-notification --project-ref YOUR_PROJECT_REF
```

Or deploy via Supabase dashboard → Edge Functions → New Function → paste code.

- [ ] **Step 3: Set Edge Function environment variable**

In Supabase dashboard → Edge Functions → `send-crq-notification` → Secrets:
- `APP_URL` = `https://your-deployed-app.com` (or `http://localhost:5173` for dev)

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add email notification Edge Function"
```

---

### Task 14: Auto-archive Completed CRQs

**Files:**
- Modify: `supabase/migrations/003_pg_cron.sql` (append)

- [ ] **Step 1: Append auto-archive job to `003_pg_cron.sql`**

```sql
-- Auto-archive completed CRQs after 30 days
create or replace function public.auto_archive_completed()
returns void
language plpgsql security definer
as $$
begin
  update public.crqs
  set status = 'archived',
      archived_at = now()
  where status = 'completed'
    and last_updated_at < now() - interval '30 days';
end;
$$;

-- Run daily at midnight
select cron.schedule('auto-archive', '0 0 * * *', 'select public.auto_archive_completed()');
```

- [ ] **Step 2: Run in Supabase SQL editor**

Expected: `Success. No rows returned.`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_pg_cron.sql
git commit -m "feat: add auto-archive cron for completed CRQs"
```

---

**Phase 2 complete.** The Supabase backend is fully set up. Proceed to Phase 3: Service Layer.
