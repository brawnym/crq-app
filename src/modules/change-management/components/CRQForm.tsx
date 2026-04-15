import { FormEvent, useState } from 'react';
import type { CRQ, CRQPriority } from '@modules/change-management/types';
import type { User, Project } from '@shared/types';
import { Button } from '@shared/ui/Button';

export interface CRQFormData {
  title: string;
  description: string;
  priority: CRQPriority;
  project_id: string | null;
  requested_by: string;
  requested_date: string;
  authorized_by: string;
  changes_effective_from: string;
  due_date: string | null;
  approver_ids: string[];
}

interface CRQFormProps {
  projects: Project[];
  approvers: User[];
  initialValues?: Partial<CRQ>;
  onSubmit: (data: CRQFormData) => Promise<void>;
  onSaveAsDraft?: (data: CRQFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function CRQForm({ projects, approvers, initialValues, onSubmit, onSaveAsDraft, onCancel, submitLabel = 'Save' }: CRQFormProps) {
  const [form, setForm] = useState<CRQFormData>({
    title:                  initialValues?.title ?? '',
    description:            initialValues?.description ?? '',
    priority:               initialValues?.priority ?? 'medium',
    project_id:             initialValues?.project_id ?? null,
    requested_by:           initialValues?.requested_by ?? '',
    requested_date:         initialValues?.requested_date ?? '',
    authorized_by:          initialValues?.authorized_by ?? '',
    changes_effective_from: initialValues?.changes_effective_from ?? '',
    due_date:               initialValues?.due_date ?? '',
    approver_ids:           initialValues?.approvers?.map((a) => a.approver_id) ?? [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CRQFormData>(key: K, value: CRQFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleApprover(id: string) {
    setForm((prev) => ({
      ...prev,
      approver_ids: prev.approver_ids.includes(id)
        ? prev.approver_ids.filter((x) => x !== id)
        : [...prev.approver_ids, id],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.approver_ids.length === 0) {
      setError('At least one approver is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ ...form, due_date: form.due_date || null });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveAsDraft() {
    setError(null);
    setSavingDraft(true);
    try {
      await onSaveAsDraft!({ ...form, due_date: form.due_date || null });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingDraft(false);
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} role="form" className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Details</h3>
        <div>
          <label htmlFor="crq-title" className={labelClass}>Title</label>
          <input id="crq-title" className={inputClass} value={form.title}
            onChange={(e) => set('title', e.target.value)} required />
        </div>
        <div>
          <label htmlFor="crq-description" className={labelClass}>Description</label>
          <textarea id="crq-description" rows={4} className={inputClass} value={form.description}
            onChange={(e) => set('description', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="crq-priority" className={labelClass}>Priority</label>
            <select id="crq-priority" className={inputClass} value={form.priority}
              onChange={(e) => set('priority', e.target.value as CRQPriority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label htmlFor="crq-project" className={labelClass}>Project</label>
            <select id="crq-project" className={inputClass} value={form.project_id ?? ''}
              onChange={(e) => set('project_id', e.target.value || null)}>
              <option value="">— Select project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Request Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="requested-by" className={labelClass}>Requested By</label>
            <input id="requested-by" className={inputClass} value={form.requested_by}
              onChange={(e) => set('requested_by', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="requested-date" className={labelClass}>Requested Date</label>
            <input id="requested-date" type="date" className={inputClass} value={form.requested_date}
              onChange={(e) => set('requested_date', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="authorized-by" className={labelClass}>Authorized By</label>
            <input id="authorized-by" className={inputClass} value={form.authorized_by}
              onChange={(e) => set('authorized_by', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="effective-from" className={labelClass}>Changes Effective From</label>
            <input id="effective-from" type="date" className={inputClass} value={form.changes_effective_from}
              onChange={(e) => set('changes_effective_from', e.target.value)} required />
          </div>
        </div>
        <div>
          <label htmlFor="due-date" className={labelClass}>SLA Due Date (optional)</label>
          <input id="due-date" type="datetime-local" className={inputClass} value={form.due_date}
            onChange={(e) => set('due_date', e.target.value)} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Approvers</h3>
        <div className="space-y-2">
          {approvers.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.approver_ids.includes(a.id)}
                onChange={() => toggleApprover(a.id)} />
              {a.full_name} <span className="text-gray-400">{a.email}</span>
            </label>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        {onSaveAsDraft && (
          <Button type="button" variant="secondary" onClick={handleSaveAsDraft} disabled={savingDraft || submitting}>
            {savingDraft ? 'Saving…' : 'Save as Draft'}
          </Button>
        )}
        <Button type="submit" disabled={submitting || savingDraft}>
          {submitting ? 'Submitting…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
