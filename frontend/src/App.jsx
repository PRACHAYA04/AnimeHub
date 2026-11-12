import { useEffect, useState } from 'react';
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
import TextSizeToggle from './components/TextSizeToggle';
import Recommendations from './pages/Recommendations';

function Brand({ footer = false }) {
  return <Link to="/" className={`brand ${footer ? 'brand-footer' : ''}`} aria-label="AnimeCenter หน้าแรก">
    <img src={`${process.env.PUBLIC_URL}/icon.svg`} width="42" height="42" alt="" />
    <span className="brand-name">Anime<span>Center</span><small>พื้นที่ของคนรักอนิเมะ</small></span>
  </Link>;
}

function Shell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); setShowTop(window.scrollY > 700); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sections marked data-reveal fade in as they scroll into view (skipped for reduced motion or old browsers).
  useEffect(() => {
    const main = document.getElementById('main');
    if (!main || !('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const root = document.documentElement;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    const observe = () => document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach(el => observer.observe(el));
    root.classList.add('reveal-ready');
    observe();
    const mutations = new MutationObserver(observe);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutations.disconnect(); root.classList.remove('reveal-ready'); };
  }, []);

  function backToTop() {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  }

  async function logout() {
    try { await auth.logout(); } catch (_) {}
    navigate('/');
  }

  const nav = ({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`;

  return <>
    <a href="#main" className="skip-link">ข้ามไปเนื้อหา</a>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="site-nav site-container" aria-label="เมนูหลัก">
        <Brand />
        <div className="nav-links">
          <NavLink end to="/" className={nav}><Icon name="compass" size={17} />หน้าแรก</NavLink>
          <NavLink to="/anime" className={nav}><Icon name="grid" size={16} />อนิเมะทั้งหมด</NavLink>
          <NavLink to="/me/recommendations" className={nav}><Icon name="sparkle" size={17} />แนะนำสำหรับคุณ</NavLink>
          <NavLink to="/me/wishlist" className={nav}><Icon name="bookmark" size={16} />รายการอยากดู</NavLink>
          {auth.isAdmin && <NavLink to="/admin" className={nav}><Icon name="settings" size={17} />หลังบ้าน</NavLink>}
        </div>
        <div className="nav-actions">
          <TextSizeToggle />
          <ThemeToggle />
          <span className="nav-divider" />
          {auth.isLoggedIn ? <>
            <Link to="/profile" className="profile-link" aria-label={`โปรไฟล์ ${auth.member.displayName}`}><span className="avatar">{auth.member.displayName?.slice(0, 1)}</span><span className="profile-name">{auth.member.displayName}</span></Link>
            <button type="button" onClick={logout} className="icon-button" aria-label="ออกจากระบบ" title="ออกจากระบบ"><Icon name="logout" size={18} /></button>
          </> : <Link className="btn nav-login" to="/login"><Icon name="user" size={16} /><span>เข้าสู่ระบบ</span><Icon name="arrow" size={16} className="login-arrow" /></Link>}
        </div>
      </nav>
    </header>
    <main id="main" className={`site-main site-container ${pathname === '/' ? 'is-home' : ''}`} tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Catalog home />} />
        <Route path="/anime" element={<Catalog />} />
        <Route path="/anime/:id" element={<Detail />} />
        <Route path="/login" element={<Auth key="login" />} />
        <Route path="/register" element={<Auth key="register" register />} />
        <Route path="/profile" element={<Guard><Profile /></Guard>} />
        <Route path="/me/wishlist" element={<Guard><Catalog wishlist /></Guard>} />
        <Route path="/me/recommendations" element={<Guard><Recommendations /></Guard>} />
        <Route path="/admin/*" element={<Guard admin><Admin /></Guard>} />
        <Route path="/lab" element={<Lab />} />
        <Route path="*" element={<div className="empty-state"><span className="not-found-number">404</span><h1 className="page-title">หลงมาอีกโลกแล้ว</h1><p className="muted my-5">ไม่พบหน้าที่คุณกำลังหา กลับไปค้นพบเรื่องใหม่กัน</p><Link className="btn" to="/">กลับหน้าแรก<Icon name="arrow" size={16} /></Link></div>} />
      </Routes>
    </main>
    <footer className="site-footer">
      <div className="site-container footer-top" data-reveal><div><Brand footer /><p className="footer-tagline">ทุกเรื่องราว มีคนที่รอค้นพบ</p></div><p className="footer-description">พื้นที่เล็ก ๆ สำหรับคนรักอนิเมะ<br />ค้นพบเรื่องใหม่ เก็บเรื่องโปรด แบ่งปันมุมมอง</p><div className="footer-links"><Link to="/anime">สำรวจอนิเมะ<Icon name="arrowUpRight" size={14} /></Link><Link to="/me/wishlist">รายการของฉัน<Icon name="arrowUpRight" size={14} /></Link></div></div>
      <div className="site-container footer-bottom"><p>© {new Date().getFullYear()} AnimeCenter<span className="footer-heart">Made for anime lovers</span></p><div><a href="https://jikan.moe/" target="_blank" rel="noreferrer">ข้อมูล Jikan / MyAnimeList · ไม่ใช่บริการทางการของ MAL</a><Link to="/lab">API Lab<Icon name="arrowUpRight" size={12} /></Link></div></div>
    </footer>
    <button type="button" className={`back-to-top ${showTop ? 'is-visible' : ''}`} onClick={backToTop} aria-label="กลับขึ้นด้านบน" title="กลับขึ้นด้านบน" tabIndex={showTop ? 0 : -1} aria-hidden={!showTop}><Icon name="arrowUp" size={20} /></button>
  </>;
}

export default function App() { return <AuthProvider><Shell /></AuthProvider>; }
