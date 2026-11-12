import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';

export default function Auth({ register = false }) {
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function change(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (register) await apiFetch('/api/auth/register', { method: 'POST', body: form });
      await login(form.email, form.password);
      const from = location.state?.from;
      navigate(from?.startsWith('/') && !from.startsWith('//') ? from : '/');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <div className="auth-layout">
    <aside className="auth-visual">
      <Link to="/" className="auth-brand-mark" aria-label="AnimeHub หน้าแรก"><img src={`${process.env.PUBLIC_URL}/icon.svg`} width="68" height="68" alt="" /></Link>
      <p className="eyebrow">WELCOME TO ANIMEHUB</p>
      <h2 className="auth-brand-title">Anime<span>Hub</span></h2>
      <p className="auth-brand-tagline">พื้นที่ของคนรักอนิเมะ</p>
      <p className="auth-brand-description">ค้นพบอนิเมะเรื่องใหม่ เก็บเรื่องที่อยากดู<br />และแบ่งปันมุมมองกับคนที่ชอบเหมือนกัน</p>
      <div className="auth-features"><span><Icon name="compass" size={17} />ค้นพบเรื่องใหม่</span><span><Icon name="bookmark" size={17} />เก็บเรื่องโปรด</span><span><Icon name="star" size={17} />รีวิวและให้คะแนน</span></div>
      <span className="auth-visual-bottom">ทุกเรื่องราว มีคนที่รอค้นพบ</span>
    </aside>
    <div className="auth-form-side">
      <p className="eyebrow">{register ? 'เริ่มต้นเรื่องราวของคุณ' : 'ยินดีต้อนรับกลับ'}</p>
      <h1 className="page-title">{register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'} <span className="auth-title-brand">AnimeHub</span></h1>
      <p className="auth-form-description">{register ? 'สร้างบัญชีเพื่อเก็บเรื่องโปรดและร่วมแบ่งปันรีวิวอนิเมะ' : 'เข้าสู่บัญชีของคุณ แล้วกลับไปหาอนิเมะเรื่องโปรดกัน'}</p>
      {location.state?.passwordChanged && <p role="status" className="notice">เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบด้วยรหัสใหม่</p>}
      <form onSubmit={submit}>
        {register && <label>ชื่อที่แสดง<input required maxLength={50} autoComplete="nickname" className="field" name="displayName" placeholder="ให้เราเรียกคุณว่าอะไรดี" value={form.displayName} onChange={change} /></label>}
        <label>อีเมล<input className="field" type="email" name="email" autoComplete="email" placeholder="you@example.com" required maxLength={255} value={form.email} onChange={change} /></label>
        <label>รหัสผ่าน<input className="field" name="password" type="password" placeholder={register ? 'ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร' : 'กรอกรหัสผ่านของคุณ'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : undefined} value={form.password} onChange={change} /></label>
        {register && <p className="text-xs muted">อย่างน้อย 8 ตัวอักษร ไม่เกิน 72 ไบต์</p>}
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}{!busy && <Icon name="arrow" size={17} />}</button>
        <p className="auth-switch">{register ? 'มีบัญชีแล้ว? ' : 'ยังไม่มีบัญชี? '}<Link to={register ? '/login' : '/register'} state={location.state?.from ? { from: location.state.from } : undefined}>{register ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</Link></p>
      </form>
    </div>
  </div>;
}
