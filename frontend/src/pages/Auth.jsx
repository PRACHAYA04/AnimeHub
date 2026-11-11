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
      <span className="auth-visual-icon"><Icon name="bookmark" size={31} /></span>
      <p className="eyebrow">EVERY STORY STARTS SOMEWHERE</p>
      <h2>เรื่องราวดี ๆ<br />เริ่มต้นที่<span>ความชอบเดียวกัน.</span></h2>
      <p>เก็บอนิเมะที่อยากดู ให้คะแนนเรื่องที่คุณรัก<br />แล้วแบ่งปันมุมมองกับคนคอเดียวกัน</p>
      <span className="auth-visual-bottom">YOUR STORIES. YOUR LITTLE UNIVERSE.</span>
    </aside>
    <div className="auth-form-side">
      <p className="eyebrow">{register ? 'JOIN THE ANIME SIDE' : 'HELLO AGAIN, ANIME LOVER'}</p>
      <h1 className="page-title">{register ? 'เข้าร่วม Anime Center' : 'ยินดีต้อนรับกลับ'}<span className="accent">.</span></h1>
      <p className="auth-form-description">{register ? 'สร้างพื้นที่สำหรับเรื่องโปรดของคุณ' : 'เรื่องโปรดของคุณ รออยู่ที่เดิม'}</p>
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
