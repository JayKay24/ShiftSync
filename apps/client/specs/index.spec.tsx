import React from 'react';
import { render } from '@testing-library/react';
import Page from '../src/app/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe('Page', () => {
  it('should render successfully', () => {
    const { getByText } = render(<Page />);
    expect(getByText('Welcome to ShiftSync')).toBeTruthy();
  });
});
