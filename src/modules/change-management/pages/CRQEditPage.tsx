import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@shared/auth/useAuth';
import { useUsers } from '@shared/users/useUsers';
import { useCRQDetail, useCRQActions } from '@modules/change-management/hooks/useCRQ';
import { CRQForm } from '@modules/change-management/components/CRQForm';
import type { CRQFormData } from '@modules/change-management/components/CRQForm';
import { appendAudit } from '@modules/change-management/services/auditService';
import { resetApproversForResubmit } from '@modules/change-management/services/approvalService';
import { listProjects } from '@modules/change-management/services/projectService';
import type { Project } from '@shared/types';

export default function CRQEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { crq, loading } = useCRQDetail(id!);
  const { users } = useUsers();
  const { updateCRQ, updateCRQStatus } = useCRQActions();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => { listProjects().then(setProjects); }, []);

  const approvers = users.filter((u) => u.role === 'approver' && u.is_active);

  if (loading) return <div>Loading…</div>;
  if (!crq) return <div>CRQ not found.</div>;
  if (crq.status !== 'draft') {
    return <div className="text-red-600">Only draft CRQs can be edited.</div>;
  }

  async function handleSubmit(data: CRQFormData) {
    const prev = { title: crq!.title, description: crq!.description, status: crq!.status };
    await updateCRQ(id!, data);
    await resetApproversForResubmit(id!);
    await updateCRQStatus(id!, 'pending_approval');
    await appendAudit({
      crq_id: id!,
      actor_id: profile!.id,
      action: 'resubmitted',
      previous_value: prev,
      new_value: { title: data.title, status: 'pending_approval' },
    });
    navigate(`/crqs/${id}`);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Edit {crq.crq_number}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <CRQForm
          projects={projects}
          approvers={approvers}
          initialValues={crq}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/crqs/${id}`)}
        />
      </div>
    </div>
  );
}
