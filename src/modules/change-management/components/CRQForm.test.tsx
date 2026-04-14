import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CRQForm } from './CRQForm';

const mockProjects = [{ id: 'p1', name: 'Project Alpha', is_active: true, description: null, owner_id: null, created_at: '' }];
const mockApprovers = [{ id: 'u1', full_name: 'Alice', email: 'alice@example.com', role: 'approver' as const, is_active: true, created_at: '' }];

describe('CRQForm', () => {
  it('renders all required fields', () => {
    render(
      <CRQForm
        projects={mockProjects}
        approvers={mockApprovers}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/requested by/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/authorized by/i)).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <CRQForm
        projects={mockProjects}
        approvers={mockApprovers}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My CRQ' } });
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    fireEvent.submit(screen.getByRole('form'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
