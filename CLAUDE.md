# CRQ App

Change Request management application. Requesters create CRQs, approvers action them, admins manage users and projects.

---

## Architecture Principles

- Feature-first modular design — modules are self-contained with their own services, hooks, components, and pages
- Services handle all external communication — no direct Supabase calls in components
- Hooks orchestrate UI logic; components remain presentational
- Strict type safety across frontend and backend
- Role-based access enforced at both UI layer (`RoleGuard`) and database layer (RLS)

---

## Tech Stack

- **Frontend:** React 19, TypeScript 5, Vite 6, React Router v7, Tailwind CSS, Lucide React
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, pg_cron)
- **Testing:** Vitest, React Testing Library

---

## Folder Structure

```
src/
  shared/                        # Truly shared code used across all modules
    auth/                        # AuthProvider, useAuth, ProtectedRoute, supabaseClient, LoginPage
    access/                      # Role constants, RoleGuard, permission helpers
    types/                       # Shared types: User, Project
    ui/                          # Reusable UI: Button, Modal, StatusBadge, Layout, Navbar
    users/                       # User service, hook, UserManagementPage
  modules/
    change-management/           # CRQ feature module (self-contained)
      types/                     # CRQ, CRQApprover, AuditEntry, FollowUp
      services/                  # crqService, approvalService, auditService, followUpService, projectService
      hooks/                     # useCRQ, useApprovals, useAuditTrail
      components/                # ApproverActions, AuditTrail, CRQForm, FollowUpForm, CRQPrintView
      pages/                     # Dashboard, CRQListPage, CRQDetailPage, CRQCreatePage, CRQEditPage, ProjectManagementPage
supabase/
  migrations/                    # SQL migrations — run in Supabase SQL editor in numbered order
  functions/                     # Deno Edge Functions
docs/
  superpowers/
    plans/                       # Phase implementation plans
    specs/                       # Feature specs
```

---

## Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `@shared/*` | `src/shared/*` |
| `@modules/*` | `src/modules/*` |

---

## Data Access Rules

- All Supabase interactions go through the service layer (`src/modules/*/services/` or `src/shared/users/`)
- No direct Supabase calls inside React components — ever
- All service responses typed using shared types from `@shared/types` or `@modules/*/types`
- Errors normalised before reaching the UI — components never handle raw Supabase error objects

---

## State Management

- Server state handled via custom hooks wrapping service functions (e.g. `useCRQList`, `useCRQDetail`)
- Local UI state via React `useState` / `useReducer`
- No global state store unless a clear, justified need arises
- Loading and error state owned by hooks, not components

---

## User Roles

| Role | Permissions |
|------|-------------|
| `requester` | Create and edit own CRQs, send follow-ups |
| `approver` | Approve, reject, or send back assigned CRQs |
| `admin` | Full access — manage users and projects |

---

## Database Design Guidelines

- UUIDs for all primary keys (`gen_random_uuid()`)
- All tables include `id` and `created_at`; mutable tables include `last_updated_at`
- Soft deletes via `archived_at` (CRQs) — no hard deletes on business records
- Audit trail stored in a dedicated `audit_trail` table (append-only, never updated)
- Foreign keys defined with explicit cascade rules on every relationship

---

## RLS (Row Level Security)

- RLS enabled on all tables — no exceptions
- Policies must never rely on client-side role checks
- `get_my_role()` is a `security definer` function that centralises role evaluation and prevents recursive RLS evaluation on the `users` table
- Authorization logic lives in RLS policies and Edge Functions — `RoleGuard` is UI-only gating, not a security boundary

---

## Error Handling

- Service functions return typed results; errors caught and normalised before reaching hooks
- UI components receive clean error messages, never raw Supabase error objects
- User-facing errors surfaced via a toast/notification system
- Critical failures logged for observability (Edge Function logs in Supabase dashboard)

---

## Logging & Monitoring

- All CRQ actions recorded in `audit_trail` (actor, action, before/after values)
- Edge Function logs available in Supabase dashboard → Edge Functions
- SLA breach and approaching-deadline events logged as audit entries before email dispatch

---

## Security Considerations

- All sensitive operations enforced at database level via RLS — frontend is UI only
- No authorization logic in React components; use `RoleGuard` for UI gating only
- Only the anon key is exposed to the frontend; service role key is server-side only
- Input validated at both frontend (form) and backend (RLS + Edge Function)
- `.env.local` is gitignored — never commit secrets

---

## Environments

| File | Purpose |
|------|---------|
| `.env.local` | Local development |
| `.env.staging` | Staging environment |
| `.env.production` | Production |

Supabase projects should be separated per environment (distinct projects, not schemas).

---

## Commands

```bash
npm run dev           # Dev server at http://localhost:5173
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report (target: ≥80% on services)
npm run build         # Production build
npm run preview       # Preview production build
npx tsc --noEmit      # Type check only
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
```

Never commit `.env.local`.

---

## Testing Convention

- Tests live alongside source files (`supabaseClient.test.ts` next to `supabaseClient.ts`)
- Unit tests for all services and hooks
- Component tests for critical UI flows
- Minimum 80% coverage on service files
- Mock Supabase via `vi.mock('./supabaseClient', ...)` — never hit real DB in tests
- Follow TDD: write failing test → implement → verify pass → commit

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `crq-form.tsx` |
| Components | PascalCase | `CRQForm` |
| Hooks | `useX` | `useCRQList` |
| Services | `xService.ts` | `crqService.ts` |
| Types | PascalCase | `CRQStatus` |

---

## CI/CD

- Lint, type-check (`tsc --noEmit`), and test on every PR
- Block merge if tests fail
- Deploy to Vercel on merge to `main`
