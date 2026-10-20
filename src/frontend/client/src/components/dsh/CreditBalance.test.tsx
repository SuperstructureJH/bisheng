import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreditBalance } from './CreditBalance';
import { getDshBrowserConfig, getDshCredits } from '~/api/dsh';

let mockUser = { id: 'alice' };
jest.mock('~/hooks', () => ({
  useAuthContext: () => ({ user: mockUser, isAuthenticated: true }),
  useLocalize: () => (key: string, values?: { value?: string }) => values?.value ? `Balance ${values.value}` : key,
}));
jest.mock('~/api/dsh', () => ({ getDshBrowserConfig: jest.fn(), getDshCredits: jest.fn() }));

beforeEach(() => {
  mockUser = { id: 'alice' };
  jest.mocked(getDshBrowserConfig).mockResolvedValue({ enabled: true } as never);
});

it('changes identity without showing the previous balance and refreshes after a task', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  jest.mocked(getDshCredits).mockResolvedValue({ remaining: '500' } as never);
  const wrap = (running: boolean) => <QueryClientProvider client={client}><CreditBalance running={running} /></QueryClientProvider>;
  const view = render(wrap(true));
  expect(await screen.findByText('Balance 500')).toBeInTheDocument();
  let resolveBalance!: (value: never) => void;
  jest.mocked(getDshCredits).mockImplementation(() => new Promise(resolve => { resolveBalance = resolve; }));
  mockUser = { id: 'bob' };
  view.rerender(wrap(true));
  expect(screen.queryByText('Balance 500')).toBeNull();
  await waitFor(() => expect(resolveBalance).toBeDefined());
  resolveBalance({ remaining: '20' } as never);
  expect(await screen.findByText('Balance 20')).toBeInTheDocument();
  jest.mocked(getDshCredits).mockResolvedValue({ remaining: '19.999999' } as never);
  view.rerender(wrap(false));
  expect(await screen.findByText('Balance 19.999999')).toBeInTheDocument();
  view.unmount(); client.clear();
});
