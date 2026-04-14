import { useState, useEffect, useCallback } from 'react';
import { listProjects, createProject, updateProject } from '../services/projectService';
import type { Project } from '@shared/types';
import { Button } from '@shared/ui/Button';
import { Modal } from '@shared/ui/Modal';

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjects(true);
      setProjects(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createProject({
        name: newName,
        description: newDescription || null,
        owner_id: null,
      });
      setShowModal(false);
      setNewName('');
      setNewDescription('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(project: Project) {
    await updateProject(project.id, { is_active: !project.is_active });
    await load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          New Project
        </Button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{project.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{project.description ?? ''}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {project.is_active ? (
                      <span className="text-green-700">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {project.is_active ? (
                      <Button variant="danger" size="sm" onClick={() => handleToggleActive(project)}>
                        Deactivate
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => handleToggleActive(project)}>
                        Activate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="New Project" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="project-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="project-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                Create Project
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
