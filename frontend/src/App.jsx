import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Guard } from './components/UI';
import Catalog from './pages/Catalog';
import Detail from './pages/Detail';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Lab from './pages/Lab';
import ThemeToggle from './components/ThemeToggle';
function Shell() {
 const auth = useAuth(); const navigate = useNavigate();
 async function logout() { try { await auth.logout(); } catch (_) {} navigate('/'); }
 const nav = ({ isActive }) => `rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'}`;
 return <><a href="#main" className="sr-only focus:not-sr-only">ข้ามไปเนื้อหา</a><header className="border-b border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-black/95"><nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-5 py-4"><Link to="/" className="mr-6 flex items-center gap-2 text-xl font-bold tracking-tight"><img src={`${process.env.PUBLIC_URL}/icon.svg`} width="40" height="40" alt="" aria-hidden="true" className="h-10 w-10 shrink-0" /><span className="whitespace-nowrap">Anime <span className="text-red-700 dark:text-red-400">Center</span></span></Link><NavLink end to="/" className={nav}>ค้นพบ</NavLink><NavLink to="/anime" className={nav}>อนิเมะทั้งหมด</NavLink>{auth.isLoggedIn && <NavLink to="/me/wishlist" className={nav}>รายการอยากดู</NavLink>}{auth.isAdmin && <NavLink to="/admin" className={nav}>หลังบ้าน</NavLink>}<div className="ml-auto flex items-center gap-3"><ThemeToggle />{auth.isLoggedIn ? <><Link to="/profile" className="text-sm text-red-700 dark:text-red-300">{auth.member.displayName}</Link><button onClick={logout} className="text-xs text-neutral-600 dark:text-neutral-400">ออกจากระบบ</button></> : <Link className="btn" to="/login">เข้าสู่ระบบ</Link>}</div></nav></header><main id="main" className="mx-auto min-h-[75vh] max-w-7xl px-5 py-9"><Routes><Route path="/" element={<Catalog home />} /><Route path="/anime" element={<Catalog />} /><Route path="/anime/:id" element={<Detail />} /><Route path="/login" element={<Auth />} /><Route path="/register" element={<Auth register />} /><Route path="/profile" element={<Guard><Profile /></Guard>} /><Route path="/me/wishlist" element={<Guard><Catalog wishlist /></Guard>} /><Route path="/admin/*" element={<Guard admin><Admin /></Guard>} /><Route path="/lab" element={<Lab />} /><Route path="*" element={<div className="panel text-center"><h1 className="page-title">404</h1><p className="my-5">ไม่พบหน้าที่คุณกำลังหา</p><Link className="btn" to="/">กลับหน้าแรก</Link></div>} /></Routes></main><footer className="border-t border-neutral-200 dark:border-white/10"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-5 py-8 text-xs text-neutral-600 dark:text-neutral-400"><p>Anime Center · ค้นพบเรื่องใหม่ เก็บเรื่องโปรด แบ่งปันมุมมอง</p><div className="flex gap-4"><a href="https://jikan.moe/" target="_blank" rel="noreferrer">ข้อมูลผ่าน Jikan / MyAnimeList · ไม่ใช่บริการทางการของ MAL</a><Link to="/lab">API Lab</Link></div></div></footer></>;
}
export default function App() { return <AuthProvider><Shell /></AuthProvider>; }
