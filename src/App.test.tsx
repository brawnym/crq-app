import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('@shared/auth/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'u1', email: 'test@example.com' },
    profile: { id: 'u1', role: 'admin' },
    loading: false,
  }),
}));

describe('App router', () => {
  it('renders dashboard at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('renders crq list at /crqs', () => {
    render(
      <MemoryRouter initialEntries={['/crqs']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('crq-list')).toBeInTheDocument();
  });

  it('redirects unknown routes to /', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});
