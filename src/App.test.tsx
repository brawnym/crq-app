import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

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
