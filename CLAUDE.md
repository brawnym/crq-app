# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

Change Request (CRQ) management for MSP². Requesters create CRQs, assign approvers, and submit for approval. Approvers action them. Admins manage users and projects.

**CRQ status flow:** `draft` → `pending_approval` → `in_implementation` → `completed`  
Side exits: `rejected` (from pending_approval), `archived` (from draft/completed/rejected)

---

## Commands

```bash
npm run dev           # Dev server (usually http://localhost:5173, also on LAN via host:true)
npm test              # Run all tests once
npm run test:watch    # Watch mode
npx tsc --noEmit      # Type check only
npm run build         # Production build
```

Run a single test file:
```bash
npm test -- --run src/path/to/file.test.ts
```

---

## Tech Stack

React 19, TypeScript 5, Vite 6 + `@tailwindcss/vite` (Tailwind v4), React Router v7, Lucide React, Supabase (PostgreSQL + Auth + Storage), Vitest + React Testing Library.

---

## Folder Structure

```
src/
  shared/
    auth/       # AuthProvider, useAuth, ProtectedRoute, supabaseClient, LoginPage,
                # ProfilePage, profileService
    access/     # ROLES constants, RoleGuard, canCreateCRQ/canApprove/canManageUsers
    types/      # User, Project, UserRole
    ui/         # Button, Modal, StatusBadge, Navbar, Layout
    users/      # userService, useUsers, UserManagementPage
  modules/
    change-management/
      types/      # CRQ, CRQApprover, AuditEntry, FollowUp, CRQFilters
      services/   # crqService, approvalService, auditService, followUpService, projectService
      hooks/      # useCRQ (list/detail/actions), useApprovals, useAuditTrail
      components/ # CRQForm, ApproverActions, FollowUpForm, AuditTrail, CRQPrintView
      pages/      # Dashboard, CRQListPage, CRQDetailPage, CRQCreatePage, CRQEditPage,
                  # ProjectManagementPage
supabase/
  migrations/   # Run numbered SQL files in order via Supabase SQL Editor
```

**Path aliases:** `@shared/*` → `src/shared/*`, `@modules/*` → `src/modules/*`

---

## Architecture Rules

- All Supabase calls go through the service layer — never in components or hooks directly
- Hooks wrap services with loading/error state; components receive clean data
- `RoleGuard` is UI-only gating — never a security boundary
- Security lives in RLS policies and security-definer SQL functions

---

## Tailwind CSS Setup (v4)

`src/index.css` uses `@import "tailwindcss"` with a `@theme` block that overrides the default blue to match the MSP² brand colour (`#2D7EC9`). The `@tailwindcss/vite` plugin is registered in `vite.config.ts`. No `tailwind.config.js` file.

---

## Vitest Mocking — Critical Pattern

Any `const` referenced inside a `vi.mock()` factory **must** use `vi.hoisted()` or you get a "Cannot access before initialization" error:

```ts
// CORRECT
const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@shared/auth/supabaseClient', () => ({ supabase: { from: mockFrom } }));

// WRONG — throws at runtime
const mockFrom = vi.fn();
vi.mock('@shared/auth/supabaseClient', () => ({ supabase: { from: mockFrom } }));
```

When a service uses `supabase.rpc(...)`, the mock must also stub `rpc`:
```ts
const mockRpc = vi.hoisted(() => vi.fn());
vi.mock('@shared/auth/supabaseClient', () => ({ supabase: { from: mockFrom, rpc: mockRpc } }));
```

When a service uses `supabase.auth.signUp(...)`, stub `auth`:
```ts
const mockSignUp = vi.hoisted(() => vi.fn().mockResolvedValue({ data: {}, error: null }));
vi.mock('@shared/auth/supabaseClient', () => ({ supabase: { from: mockFrom, auth: { signUp: mockSignUp } } }));
```

Use `import type { Session, User }` (not value import) for Supabase SDK types — Vite errors on the value export.

---

## Supabase Query Patterns

**Query chain order matters:** call `.order()` after all `.eq()` / `.neq()` / `.in()` filters, not before.

**`CRQ_SELECT` in `crqService.ts`** must include `approver_id` in the `crq_approvers` subselect:
```ts
approvers:crq_approvers(
  id, approver_id, status, comments, actioned_at,
  approver:users!approver_id(id, full_name, email)
)
```
Omitting `approver_id` makes all `a.approver_id === userId` comparisons return `undefined === userId` at runtime — silently breaking dashboard filters and approver actions.

**`due_date` is a `timestamptz` column** — always normalise empty strings to `null` before sending:
```ts
{ ...form, due_date: form.due_date || null }
```
Supabase rejects `""` with "invalid input syntax for type timestamp with time zone".

**Cross-role queries that bypass RLS** must use `supabase.rpc()` with a `SECURITY DEFINER` function. Current RPC functions:

| Function | Purpose |
|----------|---------|
| `get_my_role()` | Role lookup without recursive RLS on `users` |
| `is_crq_approver(crq_id, user_id)` | Breaks `crqs ↔ crq_approvers` RLS recursion |
| `is_crq_requester(crq_id, user_id)` | Breaks `crq_approvers ↔ crqs` RLS recursion |
| `get_active_approvers()` | Returns all active approvers — requesters can't read other users directly |
| `check_all_approved(crq_id)` | Checks all approver rows — approvers can only see their own row via RLS |

**Filtering CRQs by approver** — `crqs` has no `approver_id` column. `listCRQs` resolves `filters.approver_id` by first querying `crq_approvers` for matching `crq_id`s, then filtering the results client-side.

---

## RLS Gotchas

**Infinite recursion** occurs when `crqs` SELECT policy queries `crq_approvers` and `crq_approvers` SELECT policy queries `crqs`. Broken by using `is_crq_approver()` and `is_crq_requester()` security-definer functions instead of direct subqueries.

**Approvers need UPDATE on `crqs`** to advance status from `pending_approval` to `in_implementation`. The policy (`007_approver_update_crq.sql`) covers `approver` role explicitly.

**Silent RLS failures** — a Supabase update that violates RLS returns `{ error: null, data: null }` with no rows updated, not an error. Always verify the status change actually happened if debugging stale status issues.

---

## CRQ Workflow

- **Create:** `CRQCreatePage` offers **Submit for Approval** (primary) which creates + immediately sets `pending_approval`, and **Save as Draft** (secondary).
- **Edit:** Only allowed when status is `draft` and user is owner (requester or admin).
- **Submit:** `CRQDetailPage` shows **Submit for Approval** button on drafts with ≥1 approver assigned.
- **Approve:** Requires a mandatory comment (modal). All approvers must approve. `check_all_approved()` RPC (security-definer) verifies this. When all approved, status advances to `in_implementation`.
- **Reject / Send Back:** Any assigned approver. Both require a mandatory comment. Reject → `rejected`. Send Back → back to `draft`, approvers reset to `pending`.
- **Complete:** Requester or admin clicks **Mark Complete** when `in_implementation`. Requires a mandatory completion note (stored in audit trail `note` field).

---

## User Roles

| Role | Key permissions |
|------|----------------|
| `requester` | Create/edit own CRQs, submit for approval, send follow-ups |
| `approver` | Action (approve/reject/send back) assigned CRQs |
| `admin` | Everything — also acts as requester for own CRQs |

`canCreateCRQ`, `canApprove`, `canManageUsers` helpers are in `src/shared/access/roles.ts`.

---

## User Management & Invites

`inviteUser` in `userService.ts` uses `supabase.auth.signUp()` (not `admin.inviteUserByEmail` — that requires the service_role key which is unavailable browser-side). A random temporary password is generated and shown to the admin in a success modal.

The `handle_new_user` trigger in `001_schema.sql` reads `full_name` and `role` from `raw_user_meta_data` on signup and creates the `public.users` row automatically.

**Email confirmation:** Currently disabled in Supabase (Authentication → Providers → Email → "Confirm email" OFF) to avoid rate limits during development. For production: turn it back ON and swap the success modal notice in `UserManagementPage.tsx` (marked with `PRODUCTION` comment) and follow the comment in `userService.ts`.

---

## User Profile

Route `/profile` (`src/shared/auth/ProfilePage.tsx`). Uses `profileService.ts` for:
- `updateProfileName` — updates `public.users`
- `updatePassword` — `supabase.auth.updateUser({ password })`
- `uploadAvatar` / `saveAvatarUrl` — uploads to `avatars` storage bucket at path `{userId}/avatar.{ext}`, stores public URL with cache-busting timestamp

`AuthProvider` exposes `refreshProfile()` — call this after any profile update so the navbar reflects changes immediately.

Avatar storage bucket (`avatars`) is public. Write RLS restricts uploads to `{userId}/` prefix. Created in `008_user_avatar.sql`.

---

## Testing Conventions

- Test files live alongside source files
- Mock Supabase via `vi.mock('@shared/auth/supabaseClient', ...)` — never hit real DB
- Wrap components that use `react-router-dom` hooks in `<MemoryRouter>`
- Wrap components that use `useAuth` with a mock: `vi.mock('@shared/auth/useAuth', () => ({ useAuth: () => ({ user: {...}, profile: {...}, loading: false }) }))`

---

## Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
```

---

## Database Migrations

Migrations live in `supabase/migrations/` and must be run manually in the Supabase SQL Editor in numbered order. There is no CLI-based migration runner configured.

| File | Purpose |
|------|---------|
| `001_schema.sql` | Tables, enums, triggers (handle_new_user, set_crq_number, touch_crq_updated_at, set_initial_sla) |
| `002_rls.sql` | Initial RLS policies |
| `003_pg_cron.sql` | Scheduled jobs |
| `004_fix_rls_recursion.sql` | Fix crqs↔crq_approvers infinite recursion via security-definer helpers |
| `005_approver_visibility.sql` | Allow all users to read active approvers via RLS |
| `006_get_active_approvers_fn.sql` | `get_active_approvers()` security-definer RPC |
| `007_approver_update_crq.sql` | Allow approvers to update assigned CRQs + `check_all_approved()` RPC |
| `008_user_avatar.sql` | Add `avatar_url` to users + create `avatars` storage bucket with RLS |
