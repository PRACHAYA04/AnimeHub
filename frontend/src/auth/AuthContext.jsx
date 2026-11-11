import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api/backend';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('animehub.token'));
  const [member, setMember] = useState(null);
  const [ready, setReady] = useState(!token);
  const [authError, setAuthError] = useState('');
  const [reload, setReload] = useState(0);
  function clear() { localStorage.removeItem('animehub.token'); setToken(null); setMember(null); setReady(true); }
  useEffect(() => { window.addEventListener('animehub:expired', clear); return () => window.removeEventListener('animehub:expired', clear); }, []);
  useEffect(() => {
    let ignore = false;
    if (!token) { setReady(true); return undefined; }
    setReady(false); setAuthError('');
    apiFetch('/api/me', { token }).then(m => { if (!ignore) setMember(m); })
      .catch(e => { if (!ignore) { if (e.status === 401) clear(); else setAuthError(e.message); } })
      .finally(() => { if (!ignore) setReady(true); });
    return () => { ignore = true; };
  }, [token, reload]);
  async function login(email, password) {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('animehub.token', data.token); setMember(data.member); setToken(data.token); setAuthError('');
  }
  async function logout() { try { if (token) await apiFetch('/api/auth/logout', { method: 'POST', token }); } finally { clear(); } }
  return <AuthContext.Provider value={{ token, member, ready, authError, retryAuth: () => setReload(n => n + 1), isLoggedIn: Boolean(token && member), isAdmin: member?.role === 'admin', login, logout, clear, setMember }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
