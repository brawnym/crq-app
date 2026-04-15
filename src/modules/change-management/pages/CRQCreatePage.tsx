import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@shared/auth/useAuth';
import { listApprovers } from '@shared/users/userService';
import { useCRQActions } from '@modules/change-management/hooks/useCRQ';
import { CRQForm } from '@modules/change-management/components/CRQForm';
import type { CRQFormData } from '@modules/change-management/components/CRQForm';
import { appendAudit } from '@modules/change-management/services/auditService';
import { listProjects } from '@modules/change-management/services/projectService';
import type { Project, User } from '@shared/types';

export default function CRQCreatePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { createCRQ, updateCRQStatus } = useCRQActions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);

  useEffect(() => {
    listProjects().then(setProjects);
    listApprovers().then(setApprovers);
  }, []);

  // Primary action: create and immediately submit for approval
  async function handleSubmit(data: CRQFormData) {
    const crq = await createCRQ({ ...data, requester_id: profile!.id });
    await appendAudit({ crq_id: crq.id, actor_id: profile!.id, action: 'created', new_value: { title: crq.title } });
    await updateCRQStatus(crq.id, 'pending_approval');
    await appendAudit({ crq_id: crq.id, actor_id: profile!.id, action: 'submitted', new_value: { status: 'pending_approval' } });
    navigate(`/crqs/${crq.id}`);
  }

  // Secondary action: save as draft only
  async function handleSaveAsDraft(data: CRQFormData) {
    const crq = await createCRQ({ ...data, requester_id: profile!.id });
    await appendAudit({ crq_id: crq.id, actor_id: profile!.id, action: 'created', new_value: { title: crq.title } });
    navigate(`/crqs/${crq.id}`);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">New Change Request</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <CRQForm
          projects={projects}
          approvers={approvers}
          onSubmit={handleSubmit}
          onSaveAsDraft={handleSaveAsDraft}
          onCancel={() => navigate('/crqs')}
          submitLabel="Submit for Approval"
        />
      </div>
    </div>
  );
}
