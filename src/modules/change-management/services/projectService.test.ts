import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listProjects, createProject } from './projectService';

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@shared/auth/supabaseClient', () => ({ supabase: { from: mockFrom } }));

beforeEach(() => vi.clearAllMocks());

describe('projectService', () => {
  it('listProjects returns active projects', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'p1', name: 'Project Alpha', is_active: true }],
        error: null,
      }),
    });
    const projects = await listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Project Alpha');
  });

  it('createProject inserts and returns new project', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'p2', name: 'New Project' },
        error: null,
      }),
    });
    const project = await createProject({ name: 'New Project', description: null, owner_id: null });
    expect(project.name).toBe('New Project');
  });
});
