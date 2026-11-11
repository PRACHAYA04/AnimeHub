import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Admin from './Admin';
import { apiFetch } from '../api/backend';
jest.mock('../api/backend');
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ token: 'admin-ticket', member: { id: 1 } }) }));
const members = [{ id: 1, email: 'admin@example.org', displayName: 'Admin', role: 'admin' }, { id: 2, email: 'friend@example.org', displayName: 'Friend', role: 'member' }];
test('role change requires confirmation and own role cannot be changed', async () => { apiFetch.mockImplementation((path, options) => options?.method === 'PUT' ? Promise.resolve({ ...members[1], role: 'admin' }) : Promise.resolve({ items: members })); const user = userEvent.setup(); render(<MemoryRouter initialEntries={['/members']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Admin /></MemoryRouter>); const row = (await screen.findByText('admin@example.org')).closest('tr'); expect(within(row).getByRole('button')).toBeDisabled(); await user.click(screen.getByRole('button', { name: 'เลื่อนเป็น admin' })); expect(apiFetch.mock.calls.filter(([, o]) => o?.method === 'PUT')).toHaveLength(0); await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'ยืนยัน' })); expect(apiFetch).toHaveBeenCalledWith('/api/admin/members/2/role', { method: 'PUT', token: 'admin-ticket', body: { role: 'admin' } }); });
