import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@shared/auth/useAuth';
import { useUsers } from '@shared/users/useUsers';
import { useCRQActions } from '@modules/change-management/hooks/useCRQ';
import { CRQForm } from '@modules/change-management/components/CRQForm';
import { appendAudit } from '@modules/change-management/services/auditService';
import { listProjects } from '@modules/change-management/services/projectService';
import type { Project } from '@shared/types';

export default function CRQCreatePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { users } = useUsers();
  const { createCRQ } = useCRQActions();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => { listProjects().then(setProjects); }, []);

  const approvers = users.filter((u) => u.role === 'approver' && u.is_active);

  async function handleSubmit(data: Parameters<typeof createCRQ>[0]) {
    const crq = await createCRQ({ ...data, requester_id: profile!.id });
    await appendAudit({ crq_id: crq.id, actor_id: profile!.id, action: 'created', new_value: { title: crq.title, status: crq.status } });
    navigate(`/crqs/${crq.id}`);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">New Change Request</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <CRQForm
          projects={projects}
          approvers={approvers}
          onSubmit={handleSubmit as never}
          onCancel={() => navigate('/crqs')}
        />
      </div>
    </div>
  );
}
