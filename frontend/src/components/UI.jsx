import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
export function Loading() { return <div className="grid gap-5 py-8 sm:grid-cols-3" aria-label="กำลังโหลด">{[1, 2, 3].map(n => <div key={n} className="h-64 animate-pulse rounded-2xl bg-white/5" />)}</div>; }
export function ErrorBox({ error, onRetry }) { return <div role="alert" className="notice border-rose-400/30 bg-rose-400/10"><p>{error?.message || error}</p>{onRetry && <button className="btn mt-3" onClick={onRetry}>ลองใหม่</button>}</div>; }
export function Empty({ children = 'ยังไม่มีข้อมูลในรายการนี้' }) { return <div className="panel py-14 text-center text-slate-400">{children}</div>; }
export function Guard({ admin = false, children }) {
  const auth = useAuth(); const location = useLocation();
  if (!auth.ready) return <Loading />;
  if (auth.authError) return <ErrorBox error={auth.authError} onRetry={auth.retryAuth} />;
  if (!auth.isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && !auth.isAdmin) return <div className="panel my-10 text-center"><p className="text-6xl font-bold text-violet-300">403</p><h1 className="mt-4 text-xl">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</h1><Link className="btn mt-5" to="/">กลับหน้าแรก</Link></div>;
  return children;
}
export function ConfirmBox({ title, children, busy, onConfirm, onCancel }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4" role="dialog" aria-modal="true" aria-label={title}><div className="panel w-full max-w-md"><h2 className="text-xl font-semibold">{title}</h2><div className="my-4 text-slate-300">{children}</div><div className="flex justify-end gap-3"><button className="btn-secondary" disabled={busy} onClick={onCancel}>ยกเลิก</button><button className="btn-danger" disabled={busy} onClick={onConfirm}>{busy ? 'กำลังดำเนินการ…' : 'ยืนยัน'}</button></div></div></div>;
}
export function AnimeCard({ anime }) {
  return <Link to={`/anime/${anime.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900 transition hover:-translate-y-1 hover:border-violet-400/60"><div className="relative aspect-[2/3] overflow-hidden">{anime.poster ? <img src={anime.poster} alt={anime.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center bg-violet-950 text-5xl">✦</div>}<span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/90 px-2.5 py-1 text-xs text-amber-200">★ {anime.jikanScore ?? '—'} <span className="text-slate-400">MAL</span></span></div><div className="p-4"><p className="mb-2 text-xs text-violet-300">{anime.genre || 'ไม่ระบุแนว'} · {anime.year || 'ไม่ระบุปี'}</p><h3 className="line-clamp-2 font-semibold leading-snug">{anime.titleTh || anime.title}</h3><p className="mt-3 text-xs text-slate-400">{anime.episodes ?? '—'} ตอน · สมาชิก {anime.memberRating ?? 'ยังไม่ให้คะแนน'}</p></div></Link>;
}
