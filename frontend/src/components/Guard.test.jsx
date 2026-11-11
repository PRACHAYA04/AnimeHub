import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Guard } from './UI';
jest.mock('../auth/AuthContext');
function mount() { return render(<MemoryRouter initialEntries={['/admin']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/login" element={<p>Login page</p>} /><Route path="/admin" element={<Guard admin><p>Admin dashboard</p></Guard>} /></Routes></MemoryRouter>); }
test('guest is sent to login', () => { useAuth.mockReturnValue({ ready: true, isLoggedIn: false }); mount(); expect(screen.getByText('Login page')).toBeInTheDocument(); });
test('member cannot render admin content', () => { useAuth.mockReturnValue({ ready: true, isLoggedIn: true, isAdmin: false }); mount(); expect(screen.getByText('403')).toBeInTheDocument(); expect(screen.queryByText('Admin dashboard')).not.toBeInTheDocument(); });
test('admin is allowed', () => { useAuth.mockReturnValue({ ready: true, isLoggedIn: true, isAdmin: true }); mount(); expect(screen.getByText('Admin dashboard')).toBeInTheDocument(); });
