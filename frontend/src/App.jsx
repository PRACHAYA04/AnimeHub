import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Guard } from './components/UI';
import Catalog from './pages/Catalog';
import Detail from './pages/Detail';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Lab from './pages/Lab';
function Shell() {
 const auth = useAuth(); const navigate = useNavigate();
 async function logout() { try { await auth.logout(); } catch (_) {} navigate('/'); }
 const nav = ({ isActive }) => `rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-violet-400/10 text-violet-200' : 'text-slate-400 hover:text-white'}`;
 return <><a href="#main" className="sr-only focus:not-sr-only">ข้ามไปเนื้อหา</a><header className="border-b border-white/10 bg-slate-950/95"><nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-5 py-4"><Link to="/" className="mr-6 flex items-center gap-2 text-xl font-bold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500">✦</span>Anime<span className="text-violet-300">Hub</span></Link><NavLink end to="/" className={nav}>ค้นพบ</NavLink><NavLink to="/anime" className={nav}>อนิเมะทั้งหมด</NavLink>{auth.isLoggedIn && <NavLink to="/me/wishlist" className={nav}>รายการอยากดู</NavLink>}{auth.isAdmin && <NavLink to="/admin" className={nav}>หลังบ้าน</NavLink>}<div className="ml-auto flex items-center gap-3">{auth.isLoggedIn ? <><Link to="/profile" className="text-sm text-violet-200">{auth.member.displayName}</Link><button onClick={logout} className="text-xs text-slate-400">ออกจากระบบ</button></> : <Link className="btn" to="/login">เข้าสู่ระบบ</Link>}</div></nav></header><main id="main" className="mx-auto min-h-[75vh] max-w-7xl px-5 py-9"><Routes><Route path="/" element={<Catalog home />} /><Route path="/anime" element={<Catalog />} /><Route path="/anime/:id" element={<Detail />} /><Route path="/login" element={<Auth />} /><Route path="/register" element={<Auth register />} /><Route path="/profile" element={<Guard><Profile /></Guard>} /><Route path="/me/wishlist" element={<Guard><Catalog wishlist /></Guard>} /><Route path="/admin/*" element={<Guard admin><Admin /></Guard>} /><Route path="/lab" element={<Lab />} /><Route path="*" element={<div className="panel text-center"><h1 className="page-title">404</h1><p className="my-5">ไม่พบหน้าที่คุณกำลังหา</p><Link className="btn" to="/">กลับหน้าแรก</Link></div>} /></Routes></main><footer className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-5 py-8 text-xs text-slate-500"><p>AnimeHub · ค้นพบเรื่องใหม่ เก็บเรื่องโปรด แบ่งปันมุมมอง</p><div className="flex gap-4"><a href="https://jikan.moe/" target="_blank" rel="noreferrer">ข้อมูลผ่าน Jikan / MyAnimeList · ไม่ใช่บริการทางการของ MAL</a><Link to="/lab">API Lab</Link></div></div></footer></>;
}
export default function App() { return <AuthProvider><Shell /></AuthProvider>; }
