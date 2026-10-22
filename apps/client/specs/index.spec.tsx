import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

import LandingPage from '../src/app/routes/landing';

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('LandingPage', () => {
  it('should render successfully', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(getByText('Welcome to ShiftSync')).toBeTruthy();
  });
});
