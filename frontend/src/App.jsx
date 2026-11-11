import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Guard } from './components/UI';
import Icon from './components/Icon';
import Catalog from './pages/Catalog';
import Detail from './pages/Detail';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Lab from './pages/Lab';
import ThemeToggle from './components/ThemeToggle';

function Brand({ footer = false }) {
  return <Link to="/" className={`brand ${footer ? 'brand-footer' : ''}`} aria-label="Anime Center หน้าแรก">
    <img src={`${process.env.PUBLIC_URL}/icon.svg`} width="42" height="42" alt="" />
    <span className="brand-name">ANIME<span>CENTER<span className="brand-dot">.</span></span></span>
  </Link>;
}

function Shell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  async function logout() {
    try { await auth.logout(); } catch (_) {}
    navigate('/');
  }

  const nav = ({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`;

  return <>
    <a href="#main" className="skip-link">ข้ามไปเนื้อหา</a>
    <header className="site-header">
      <nav className="site-nav site-container" aria-label="เมนูหลัก">
        <Brand />
        <div className="nav-links">
          <NavLink end to="/" className={nav}><Icon name="compass" size={17} />ค้นพบ</NavLink>
          <NavLink to="/anime" className={nav}><Icon name="grid" size={16} />อนิเมะทั้งหมด</NavLink>
          <NavLink to="/me/wishlist" className={nav}><Icon name="bookmark" size={16} />รายการอยากดู</NavLink>
          {auth.isAdmin && <NavLink to="/admin" className={nav}><Icon name="settings" size={17} />หลังบ้าน</NavLink>}
        </div>
        <div className="nav-actions">
          <ThemeToggle />
          <span className="nav-divider" />
          {auth.isLoggedIn ? <>
            <Link to="/profile" className="profile-link" aria-label={`โปรไฟล์ ${auth.member.displayName}`}><span className="avatar">{auth.member.displayName?.slice(0, 1)}</span><span className="profile-name">{auth.member.displayName}</span></Link>
            <button type="button" onClick={logout} className="icon-button" aria-label="ออกจากระบบ" title="ออกจากระบบ"><Icon name="logout" size={18} /></button>
          </> : <Link className="btn nav-login" to="/login"><Icon name="user" size={16} /><span>เข้าสู่ระบบ</span><Icon name="arrow" size={16} className="login-arrow" /></Link>}
        </div>
      </nav>
    </header>
    <main id="main" className="site-main site-container" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Catalog home />} />
        <Route path="/anime" element={<Catalog />} />
        <Route path="/anime/:id" element={<Detail />} />
        <Route path="/login" element={<Auth key="login" />} />
        <Route path="/register" element={<Auth key="register" register />} />
        <Route path="/profile" element={<Guard><Profile /></Guard>} />
        <Route path="/me/wishlist" element={<Guard><Catalog wishlist /></Guard>} />
        <Route path="/admin/*" element={<Guard admin><Admin /></Guard>} />
        <Route path="/lab" element={<Lab />} />
        <Route path="*" element={<div className="empty-state"><span className="not-found-number">404</span><h1 className="page-title">หลงมาอีกโลกแล้ว</h1><p className="muted my-5">ไม่พบหน้าที่คุณกำลังหา กลับไปค้นพบเรื่องใหม่กัน</p><Link className="btn" to="/">กลับหน้าแรก<Icon name="arrow" size={16} /></Link></div>} />
      </Routes>
    </main>
    <footer className="site-footer">
      <div className="site-container footer-top"><div><Brand footer /><p className="footer-tagline">ทุกเรื่องราว มีคนที่รอค้นพบ</p></div><p className="footer-description">พื้นที่เล็ก ๆ สำหรับคนรักอนิเมะ<br />ค้นพบเรื่องใหม่ เก็บเรื่องโปรด แบ่งปันมุมมอง</p><div className="footer-links"><Link to="/anime">สำรวจอนิเมะ<Icon name="arrowUpRight" size={14} /></Link><Link to="/me/wishlist">รายการของฉัน<Icon name="arrowUpRight" size={14} /></Link></div></div>
      <div className="site-container footer-bottom"><p>© {new Date().getFullYear()} Anime Center<span className="footer-heart">Made for anime lovers.</span></p><div><a href="https://jikan.moe/" target="_blank" rel="noreferrer">ข้อมูล Jikan / MyAnimeList · ไม่ใช่บริการทางการของ MAL</a><Link to="/lab">API Lab<Icon name="arrowUpRight" size={12} /></Link></div></div>
    </footer>
  </>;
}

export default function App() { return <AuthProvider><Shell /></AuthProvider>; }
