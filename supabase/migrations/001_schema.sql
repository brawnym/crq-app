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

-- Set sla_deadline on insert
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
