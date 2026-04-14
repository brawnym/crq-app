# Change Management Module — Design Spec
**Date:** 2026-04-13  
**Status:** Approved  
**Module:** `modules/change-management`  
**Part of:** Larger multi-module platform (this is Module 1)

---

## 1. Overview

A change management application for tracking and approving Change Requests (CRQs) across multiple projects. Requesters create CRQs, assign approvers, and track progress. Approvers review and action CRQs. Admins manage users and projects. The system enforces SLA windows, maintains a full audit trail, and supports PDF export for client delivery.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend / Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + password) |
| Email notifications | Supabase Edge Functions + built-in SMTP |
| SLA cron jobs | Supabase pg_cron |
| PDF export | Browser `window.print()` + print CSS |

---

## 3. Project Structure

```
src/
├── core/                          # Shared across all modules
│   ├── auth/                      # Supabase auth, session, protected routes
│   ├── users/                     # User management (Admin)
│   ├── roles/                     # Role definitions & route guards
│   ├── notifications/             # Supabase Edge Function wrappers
│   └── components/                # Shared UI (Layout, Navbar, Button, Modal, etc.)
│
├── modules/
│   └── change-management/
│       ├── components/            # CRQ form, list, detail, audit trail, PDF view
│       ├── pages/
│       │   ├── Dashboard.tsx      # Role-aware dashboard
│       │   ├── CRQListPage.tsx
│       │   ├── CRQDetailPage.tsx
│       │   ├── CRQCreatePage.tsx
│       │   └── AdminView.tsx
│       ├── hooks/                 # useCRQ, useApprovals, useAuditTrail
│       ├── services/              # Supabase queries for CRQs, approvals, projects
│       └── types/                 # CRQ, Approval, AuditEntry, Project TypeScript types
│
├── App.tsx
└── main.tsx
```

---

## 4. Roles

| Role | Capabilities |
|---|---|
| **Requester** | Create, edit (own draft/sent-back), submit, follow-up, archive own CRQs, export PDF |
| **Approver** | Approve, reject, send back assigned CRQs, view assigned CRQs |
| **Admin** | All of the above + manage users, manage projects, view all CRQs, force archive |

- One role per user — roles are not combinable
- Enforced at both the frontend (route guards, conditional UI) and backend (Supabase RLS policies)
- Admin user management is in `core/users` and will be reused by future modules unchanged

---

## 5. Data Model

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Supabase auth user id |
| full_name | text | |
| email | text | |
| role | enum | `requester`, `approver`, `admin` |
| is_active | boolean | Soft disable without deleting |
| created_at | timestamp | |

### `projects`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| name | text | |
| description | text | Optional |
| owner_id | uuid | FK → users (project owner / client contact) |
| is_active | boolean | |
| created_at | timestamp | |

### `crqs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| crq_number | text | Auto-generated e.g. `CRQ-2026-0001` |
| title | text | |
| description | text | |
| status | enum | `draft`, `pending_approval`, `in_implementation`, `completed`, `rejected`, `archived` |
| priority | enum | `low`, `medium`, `high`, `critical` |
| project_id | uuid | FK → projects |
| requester_id | uuid | FK → users |
| requested_by | text | Manual field — filled by requester |
| requested_date | date | Manual field — filled by requester |
| authorized_by | text | Manual field — filled by requester |
| changes_effective_from | date | Manual field — filled by requester |
| due_date | timestamp | Optional — overrides 24hr SLA default |
| sla_deadline | timestamp | Computed: `last_updated_at + 24hr` or `due_date` |
| last_updated_at | timestamp | Resets SLA clock on every update |
| archived_at | timestamp | Null until archived |
| created_at | timestamp | |

### `crq_approvers`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| crq_id | uuid | FK → crqs |
| approver_id | uuid | FK → users |
| status | enum | `pending`, `approved`, `rejected`, `sent_back` |
| comments | text | Required when status is `rejected` or `sent_back` |
| actioned_at | timestamp | |

### `audit_trail`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| crq_id | uuid | FK → crqs |
| actor_id | uuid | FK → users |
| action | text | `created`, `edited`, `submitted`, `approved`, `rejected`, `sent_back`, `resubmitted`, `followed_up`, `completed`, `archived` |
| previous_value | jsonb | Snapshot of fields before change |
| new_value | jsonb | Snapshot of fields after change |
| note | text | Optional human-readable context |
| created_at | timestamp | |

### `follow_ups`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| crq_id | uuid | FK → crqs |
| sender_id | uuid | FK → users (requester) |
| recipient_id | uuid | FK → users (approver) |
| message | text | |
| created_at | timestamp | |

---

## 6. CRQ Lifecycle & State Machine

```
                    ┌─────────┐
                    │  DRAFT  │◄──────────────────┐
                    └────┬────┘                   │
                         │ Submit                 │
                         ▼                        │
               ┌──────────────────┐               │
               │ PENDING APPROVAL │               │ Edit & Resubmit
               └────────┬─────────┘               │
                        │                         │
           ┌────────────┼────────────┐            │
           │            │            │            │
           ▼            ▼            ▼            │
      ┌─────────┐  ┌─────────┐  ┌───────────┐    │
      │APPROVED │  │REJECTED │  │ SENT BACK │────►┘
      └────┬────┘  └─────────┘  └───────────┘
           │
           │ (all approvers approved)
           ▼
  ┌──────────────────────┐
  │   IN IMPLEMENTATION  │
  └──────────┬───────────┘
             │ Mark complete
             ▼
        ┌──────────┐
        │ COMPLETED│
        └──────────┘

  ARCHIVED can be applied to any state (manual or auto after completion)
```

### Transition Rules

| From | To | Who | Condition |
|---|---|---|---|
| Draft | Pending Approval | Requester | At least one approver assigned |
| Pending Approval | Approved | System | All assigned approvers have approved |
| Pending Approval | Rejected | Approver | Any approver rejects (mandatory comment) |
| Pending Approval | Sent Back | Approver | Approver requests changes (mandatory comment) |
| Sent Back | Draft | System | Auto on send-back so requester can edit |
| Draft | Pending Approval | Requester | Resubmit after editing |
| Approved | In Implementation | System | Auto-transition once fully approved |
| In Implementation | Completed | Requester | Marks implementation done |
| Any | Archived | Requester / Admin | Manual archive anytime |
| Completed | Archived | System | Auto-archive after 30 days (configurable) |

### SLA Rules
- Clock starts when a CRQ enters **Pending Approval** or **In Implementation**
- SLA deadline = `last_updated_at + 24 hours` unless a custom `due_date` is set
- Overdue CRQs are visually flagged on the dashboard
- Requester can send a follow-up to nudge approvers — logged and triggers email

---

## 7. UI Pages & Access

| Page | Requester | Approver | Admin |
|---|---|---|---|
| Dashboard | Own CRQs summary + SLA status | Pending approvals queue | All CRQs overview |
| CRQ List | Own CRQs + search/filter | Assigned CRQs + search/filter | All CRQs + search/filter |
| CRQ Create | Yes | No | Yes |
| CRQ Detail | Own CRQs | Assigned CRQs | All |
| CRQ Edit | Draft / Sent Back only | No | Yes |
| User Management | No | No | Yes |
| Project Management | No | No | Yes |

### CRQ List Filters
- Status (multi-select)
- Project
- Priority
- Assigned approver
- Date range
- Include archived (toggle, off by default)
- Search by CRQ number or title

---

## 8. Notifications & Email Triggers

| Event | Recipient(s) | Subject |
|---|---|---|
| CRQ submitted for approval | All assigned approvers | `[CRQ-XXXX] Action Required: Approval Needed` |
| CRQ approved | Requester | `[CRQ-XXXX] Approved — Ready for Implementation` |
| CRQ rejected | Requester | `[CRQ-XXXX] Rejected — See Comments` |
| CRQ sent back | Requester | `[CRQ-XXXX] Changes Requested — See Comments` |
| CRQ resubmitted after edit | All assigned approvers | `[CRQ-XXXX] Resubmitted for Approval` |
| Follow-up sent | Pending approvers | `[CRQ-XXXX] Follow-Up: Approval Reminder` |
| Implementation completed | All approvers + Admin | `[CRQ-XXXX] Implementation Completed` |
| SLA approaching (80% of window) | Responsible party | `[CRQ-XXXX] SLA Reminder — Action Due Soon` |
| SLA breached | Responsible party + Admin | `[CRQ-XXXX] SLA Overdue — Immediate Action Required` |

**Implementation:**
- Supabase Database Webhooks trigger on row insert/update in `crqs` and `crq_approvers`
- Webhooks invoke a Supabase Edge Function that composes and sends email via Supabase SMTP
- SLA reminders use a Supabase `pg_cron` job running hourly

Every email includes: CRQ number, title, project name, current status, direct link to detail page, and approver comments where applicable.

---

## 9. Auth & Role Management

- Supabase Auth (email + password)
- Admin creates users — Supabase sends invite email, user sets password on first login
- Deactivated users (`is_active = false`) cannot log in
- Role changes take effect immediately

### RLS Policy Summary

| Table | Requester | Approver | Admin |
|---|---|---|---|
| crqs | Read/write own | Read assigned | Read/write all |
| crq_approvers | Read own CRQ's | Read/write own rows | Read/write all |
| audit_trail | Read own CRQ's trail | Read assigned CRQ's trail | Read all |
| follow_ups | Read/write own | Read own | Read/write all |
| users | Read own profile | Read own profile | Read/write all |
| projects | Read | Read | Read/write all |

---

## 10. Audit Trail & PDF Export

### Audit Trail
- Append-only — no record is ever edited or deleted
- Recorded on: CRQ created, edited, status change, approver action, follow-up sent, admin field update
- UI: Chronological timeline on CRQ detail page showing actor, action, timestamp, and field diff
- Scoped per RLS — users only see trail entries for CRQs they have access to

### PDF Export
- Available on CRQ detail page when status is `approved` or beyond
- Implemented via `window.print()` + print CSS stylesheet (no external library)
- PDF contents:
  1. Header — App name, CRQ number, generated date
  2. Project details — Project name, client/owner
  3. CRQ fields — Title, description, priority, status, effective dates
  4. Requestor information — Requested by, requested date, authorized by, changes effective from
  5. Approvers — Name, decision, comments, date actioned
  6. Audit summary — Key milestones (created, submitted, approved, implemented)
  7. Footer — Generated by [App Name] on [date]
