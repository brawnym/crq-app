# CRQ App — Phase 5: Testing + Deployment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill gaps in test coverage, run the full test suite, verify the app in a browser end-to-end, and deploy to production (Vercel + Supabase).

**Architecture:** Tests live alongside source files. No separate `tests/` root. Coverage threshold: 80% on service files. Deployment uses Vercel CLI for the frontend. Supabase is already hosted.

**Tech Stack:** Vitest, React Testing Library, Vercel CLI

**Prerequisite:** All previous phases complete. `npm test` must pass before deployment.

---

## File Map

| File | Purpose |
|---|---|
| `src/modules/change-management/services/crqService.test.ts` | Extended CRQ service tests |
| `src/modules/change-management/hooks/useCRQ.test.tsx` | Hook integration tests |
| `src/modules/change-management/components/AuditTrail.test.tsx` | Audit trail render tests |
| `src/modules/change-management/components/ApproverActions.test.tsx` | Approval action tests |
| `vercel.json` | Vercel SPA routing config |

---

### Task 33: CRQ Service — Extended Tests

**Files:**
- Modify: `src/modules/change-management/services/crqService.test.ts`

- [ ] **Step 1: Add tests for `createCRQ` and `archiveCRQ`**

Append to `src/modules/change-management/services/crqService.test.ts`:

```typescript
// Add these describe blocks to the existing test file

describe('createCRQ', () => {
  it('inserts crq and approver rows', async () => {
    const insertMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'crq-new', title: 'Test' }, error: null });

    mockFrom.mockReturnValue({
      insert: insertMock,
      select: selectMock,
      single: singleMock,
      eq: vi.fn().mockResolvedValue({ data: { id: 'crq-new', title: 'Test', approvers: [] }, error: null }),
    });

    await createCRQ({
      title: 'Test',
      description: 'Desc',
      priority: 'medium',
      project_id: null,
      requester_id: 'user-1',
      requested_by: 'Alice',
      requested_date: '2026-04-14',
      authorized_by: 'Bob',
      changes_effective_from: '2026-04-15',
      approver_ids: ['approver-1'],
    });

    expect(insertMock).toHaveBeenCalled();
  });
});

describe('archiveCRQ', () => {
  it('sets status to archived and archived_at', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ update: updateMock, eq: eqMock });

    await archiveCRQ('crq-1');

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'archived', archived_at: expect.any(String) })
    );
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/modules/change-management/services/crqService.test.ts
```

Expected: ✓ 5 tests passed

- [ ] **Step 3: Commit**

```bash
git add src/modules/change-management/services/crqService.test.ts
git commit -m "test: extend CRQ service test coverage"
```

---

### Task 34: useCRQ Hook Tests

**Files:**
- Create: `src/modules/change-management/hooks/useCRQ.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/modules/change-management/hooks/useCRQ.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCRQList, useCRQDetail } from './useCRQ';

vi.mock('../services/crqService', () => ({
  listCRQs: vi.fn().mockResolvedValue([
    { id: 'c1', crq_number: 'CRQ-2026-0001', title: 'First CRQ', status: 'draft' },
  ]),
  getCRQ: vi.fn().mockResolvedValue({
    id: 'c1', crq_number: 'CRQ-2026-0001', title: 'First CRQ', status: 'draft',
  }),
  updateCRQStatus: vi.fn(),
  archiveCRQ: vi.fn(),
  updateCRQ: vi.fn(),
  createCRQ: vi.fn(),
}));

describe('useCRQList', () => {
  it('returns CRQs after loading', async () => {
    const { result } = renderHook(() => useCRQList({}));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.crqs).toHaveLength(1);
    expect(result.current.crqs[0].crq_number).toBe('CRQ-2026-0001');
  });
});

describe('useCRQDetail', () => {
  it('returns CRQ detail by id', async () => {
    const { result } = renderHook(() => useCRQDetail('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.crq?.title).toBe('First CRQ');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/modules/change-management/hooks/useCRQ.test.tsx
```

- [ ] **Step 3: Run tests — expect pass (no code changes needed; hook already implemented)**

```bash
npx vitest run src/modules/change-management/hooks/useCRQ.test.tsx
```

Expected: ✓ 2 tests passed

- [ ] **Step 4: Commit**

```bash
git add src/modules/change-management/hooks/useCRQ.test.tsx
git commit -m "test: add useCRQ hook tests"
```

---

### Task 35: AuditTrail Component Test

**Files:**
- Create: `src/modules/change-management/components/AuditTrail.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/modules/change-management/components/AuditTrail.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditTrail } from './AuditTrail';
import type { AuditEntry } from '@modules/change-management/types';

const entry: AuditEntry = {
  id: 'a1',
  crq_id: 'c1',
  actor_id: 'u1',
  action: 'approved',
  previous_value: null,
  new_value: null,
  note: 'Looks good',
  created_at: '2026-04-14T10:00:00Z',
  actor: { id: 'u1', full_name: 'Alice', email: 'alice@example.com', role: 'approver', is_active: true, created_at: '' },
};

describe('AuditTrail', () => {
  it('renders empty state when no entries', () => {
    render(<AuditTrail entries={[]} />);
    expect(screen.getByText('No audit history yet.')).toBeInTheDocument();
  });

  it('renders action label and actor name', () => {
    render(<AuditTrail entries={[entry]} />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('renders note text', () => {
    render(<AuditTrail entries={[entry]} />);
    expect(screen.getByText('Looks good')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/modules/change-management/components/AuditTrail.test.tsx
```

Expected: ✓ 3 tests passed

- [ ] **Step 3: Commit**

```bash
git add src/modules/change-management/components/AuditTrail.test.tsx
git commit -m "test: add AuditTrail component tests"
```

---

### Task 36: ApproverActions Component Test

**Files:**
- Create: `src/modules/change-management/components/ApproverActions.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/modules/change-management/components/ApproverActions.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApproverActions } from './ApproverActions';
import type { CRQApprover } from '@modules/change-management/types';

const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockSendBack = vi.fn();

vi.mock('@modules/change-management/hooks/useApprovals', () => ({
  useApprovals: () => ({ approve: mockApprove, reject: mockReject, sendBack: mockSendBack }),
}));

vi.mock('@shared/auth/useAuth', () => ({
  useAuth: () => ({ profile: { id: 'approver-1', role: 'approver' } }),
}));

const myApproverRow: CRQApprover = {
  id: 'row-1',
  crq_id: 'crq-1',
  approver_id: 'approver-1',
  status: 'pending',
  comments: null,
  actioned_at: null,
};

describe('ApproverActions', () => {
  it('renders Approve, Send Back, Reject buttons for pending approver', () => {
    render(<ApproverActions crqId="crq-1" approvers={[myApproverRow]} onUpdate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('calls approve when Approve button clicked', async () => {
    render(<ApproverActions crqId="crq-1" approvers={[myApproverRow]} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    expect(mockApprove).toHaveBeenCalledWith('row-1');
  });

  it('renders nothing when user is not a pending approver', () => {
    const otherApprover: CRQApprover = { ...myApproverRow, approver_id: 'someone-else' };
    const { container } = render(
      <ApproverActions crqId="crq-1" approvers={[otherApprover]} onUpdate={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/modules/change-management/components/ApproverActions.test.tsx
```

Expected: ✓ 3 tests passed

- [ ] **Step 3: Commit**

```bash
git add src/modules/change-management/components/ApproverActions.test.tsx
git commit -m "test: add ApproverActions component tests"
```

---

### Task 37: Full Test Suite Run

- [ ] **Step 1: Run all tests**

```bash
cd "D:/antigravity home/crq-app"
npx vitest run
```

Expected output: All tests pass. No failures.

- [ ] **Step 2: Run coverage report**

```bash
npx vitest run --coverage
```

Expected: Services and key components at ≥ 80% coverage.

- [ ] **Step 3: Fix any failing tests**

If any tests fail, read the error message carefully:
- Module not found → check import path aliases in `tsconfig.json`
- Mock not working → ensure `vi.mock(...)` is at the top of the file, before imports
- RenderHook error → ensure `@testing-library/react` version matches React 19

- [ ] **Step 4: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: No errors. Fix any type errors before proceeding.

- [ ] **Step 5: Commit clean state**

```bash
git add -A
git commit -m "test: all tests passing, type check clean"
```

---

### Task 38: Manual Browser Smoke Test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: `VITE ready at http://localhost:5173`

- [ ] **Step 2: Test Login flow**

1. Open http://localhost:5173
2. Should redirect to `/login`
3. Enter credentials for a user you created in Supabase (via Admin invite or direct SQL insert)
4. Should redirect to Dashboard

- [ ] **Step 3: Test Requester flow**

Login as a Requester:
1. Click "New CRQ" → fill all fields → assign an approver → Save
2. Verify CRQ appears in list with `Draft` status
3. Open CRQ detail → verify all fields shown
4. Verify audit trail shows `created` entry

- [ ] **Step 4: Test Approver flow**

Login as an Approver:
1. Dashboard should show the CRQ in "Pending My Approval"
2. Open CRQ → click Approve
3. Verify status changes to `In Implementation` if only one approver
4. Login back as Requester → verify notification received

- [ ] **Step 5: Test Send Back flow**

Login as Approver:
1. Open a pending CRQ → click "Send Back" → enter comments → confirm
2. Login as Requester → CRQ should be back to `Draft`
3. Edit the CRQ → resubmit
4. Audit trail should show `sent_back` and `resubmitted` entries

- [ ] **Step 6: Test PDF export**

1. Open a CRQ in `In Implementation` status
2. Click "Export PDF" button
3. Print view should appear with all sections
4. Click "Print / Save PDF" → browser print dialog opens
5. Click "Close" → returns to detail page

- [ ] **Step 7: Test Admin flows**

Login as Admin:
1. Go to Users → invite a new user → verify invite email sent
2. Go to Projects → create a project → verify it appears in CRQ form dropdown
3. Verify dashboard shows all active CRQs

---

### Task 39: Tailwind CSS Setup

**Note:** The UI components above use Tailwind CSS classes. If Tailwind is not yet installed, do this now.

- [ ] **Step 1: Check if Tailwind is installed**

```bash
npx tailwindcss --version
```

If missing, proceed to Step 2. If installed, skip to Task 40.

- [ ] **Step 2: Install Tailwind**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Update `vite.config.ts` to include Tailwind plugin**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@modules': resolve(__dirname, 'src/modules'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 4: Replace `src/index.css`**

```css
@import "tailwindcss";

@media print {
  .no-print {
    display: none !important;
  }

  body {
    background: white;
    color: black;
    font-size: 12px;
  }

  .print-area {
    max-width: 100%;
    padding: 0;
  }

  @page {
    margin: 20mm;
  }
}
```

- [ ] **Step 5: Restart dev server and verify styles apply**

```bash
npm run dev
```

Open http://localhost:5173/login — should show styled login form.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/index.css package.json package-lock.json
git commit -m "feat: configure Tailwind CSS"
```

---

### Task 40: Production Build

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: `dist/` folder created. No build errors.

- [ ] **Step 2: Preview production build**

```bash
npm run preview
```

Open http://localhost:4173 — should work identically to dev.

- [ ] **Step 3: Fix any build-time errors**

Common issues:
- `import.meta.env` values undefined → verify `.env.local` has both vars
- Type errors → run `npx tsc --noEmit` and fix
- Missing module aliases → verify `vite.config.ts` resolve aliases match `tsconfig.json` paths

---

### Task 41: Deploy to Vercel

- [ ] **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

- [ ] **Step 2: Create `vercel.json` for SPA routing**

Create `crq-app/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 3: Deploy**

```bash
cd "D:/antigravity home/crq-app"
vercel
```

Follow prompts:
- Set up and deploy? **Y**
- Which scope? (your account)
- Link to existing project? **N**
- Project name: `crq-app` (or your preferred name)
- Directory: `.` (current)
- Override settings? **N**

- [ ] **Step 4: Set environment variables in Vercel**

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_APP_URL production
```

Enter your values when prompted.

- [ ] **Step 5: Redeploy with env vars**

```bash
vercel --prod
```

Expected: Deployment URL printed. Open it — app should load.

- [ ] **Step 6: Update Supabase auth redirect URLs**

In Supabase dashboard → Authentication → URL Configuration:
- Site URL: `https://your-vercel-url.vercel.app`
- Redirect URLs: add `https://your-vercel-url.vercel.app/**`

- [ ] **Step 7: Update Edge Function APP_URL**

In Supabase dashboard → Edge Functions → `send-crq-notification` → Secrets:
- Update `APP_URL` = `https://your-vercel-url.vercel.app`

- [ ] **Step 8: Final production smoke test**

1. Open production URL
2. Login → create a CRQ → assign approver → submit
3. Verify email notification arrives
4. Approve → verify status transitions
5. Export PDF

- [ ] **Step 9: Commit deployment config**

```bash
git add vercel.json
git commit -m "feat: add Vercel deployment config"
```

---

### Task 42: Create First Admin User

The first admin user must be created manually since the signup flow creates requesters by default.

- [ ] **Step 1: Create first admin via Supabase SQL editor**

First, go to Supabase → Authentication → Users → "Invite user" (or "Add user") and create the admin's account.

Then update their role via SQL:

```sql
update public.users
set role = 'admin'
where email = 'your-admin@example.com';
```

- [ ] **Step 2: Verify admin can log in and see all admin menu items**

Login as the admin user. Verify:
- Users and Projects links appear in Navbar
- Dashboard shows all active CRQs
- Can invite new users

---

**Phase 5 complete. The CRQ application is fully built, tested, and deployed.**

---

## Summary: What Was Built

| Phase | Deliverable |
|---|---|
| Phase 1 | Vite project, Vitest, TypeScript paths, Supabase client, all types, router skeleton |
| Phase 2 | Full Supabase schema, RLS policies, Edge Function for email, pg_cron SLA jobs |
| Phase 3 | Auth provider, role guards, all service layers, all React hooks |
| Phase 4 | All 12 pages/components: Login, Dashboard, CRQ List, Create, Edit, Detail, Approver Actions, Follow-up, Audit Trail, PDF Print, User Mgmt, Project Mgmt |
| Phase 5 | Extended tests, full suite run, browser smoke test, Tailwind setup, Vercel deployment |
