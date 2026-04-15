import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Hoisted mocks
const mockListProjects = vi.hoisted(() => vi.fn());
const mockCreateProject = vi.hoisted(() => vi.fn());
const mockUpdateProject = vi.hoisted(() => vi.fn());

vi.mock('@modules/change-management/services/projectService', () => ({
  listProjects: mockListProjects,
  createProject: mockCreateProject,
  updateProject: mockUpdateProject,
}));

import ProjectManagementPage from './ProjectManagementPage';

const makeProject = (overrides: Partial<{
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  is_active: boolean;
  created_at: string;
}> = {}) => ({
  id: 'proj-1',
  name: 'Alpha Project',
  description: 'A test project',
  owner_id: null,
  is_active: true,
  created_at: '',
  ...overrides,
});

describe('ProjectManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: 'new-proj', name: 'New', description: null, owner_id: null, is_active: true, created_at: '' });
    mockUpdateProject.mockResolvedValue(undefined);
  });

  it('renders page heading "Project Management"', async () => {
    render(<ProjectManagementPage />);
    expect(screen.getByRole('heading', { name: /project management/i })).toBeInTheDocument();
  });

  it('renders project list with name and status', async () => {
    const projects = [
      makeProject({ id: 'p1', name: 'Alpha Project', is_active: true }),
      makeProject({ id: 'p2', name: 'Beta Project', is_active: false }),
    ];
    mockListProjects.mockResolvedValue(projects);
    render(<ProjectManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
      expect(screen.getByText('Beta Project')).toBeInTheDocument();
    });
    // Status shown
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    // Mock listProjects to never resolve
    mockListProjects.mockReturnValue(new Promise(() => {}));
    render(<ProjectManagementPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state on load failure', async () => {
    mockListProjects.mockRejectedValue(new Error('Failed to load projects'));
    render(<ProjectManagementPage />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument();
    });
  });

  it('opens new project modal when "New Project" button clicked', async () => {
    render(<ProjectManagementPage />);
    fireEvent.click(screen.getByRole('button', { name: /new project/i }));
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('submits create form with name and description', async () => {
    render(<ProjectManagementPage />);
    fireEvent.click(screen.getByRole('button', { name: /new project/i }));

    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'My New Project' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Some description' } });
    fireEvent.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: 'My New Project',
        description: 'Some description',
        owner_id: null,
      });
    });
    // Modal should close
    await waitFor(() => {
      expect(screen.queryByLabelText(/^name/i)).not.toBeInTheDocument();
    });
  });

  it('calls updateProject with is_active: false when Deactivate clicked', async () => {
    const projects = [makeProject({ id: 'p1', name: 'Alpha', is_active: true })];
    mockListProjects.mockResolvedValue(projects);
    render(<ProjectManagementPage />);

    await waitFor(() => screen.getByText('Alpha'));

    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }));

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith('p1', { is_active: false });
    });
  });

  it('calls updateProject with is_active: true when Activate clicked for inactive project', async () => {
    const projects = [makeProject({ id: 'p2', name: 'Beta', is_active: false })];
    mockListProjects.mockResolvedValue(projects);
    render(<ProjectManagementPage />);

    await waitFor(() => screen.getByText('Beta'));

    fireEvent.click(screen.getByRole('button', { name: /^activate$/i }));

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith('p2', { is_active: true });
    });
  });
});
