import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Icon from './Icon';
import Poster from './Poster';
import { genreLabels } from '../utils/genres';
export function Loading() { return <div className="anime-grid" role="status" aria-label="กำลังโหลด"><span className="sr-only">กำลังโหลดอนิเมะ</span>{Array.from({ length: 5 }, (_, n) => <div key={n} className="skeleton-card" aria-hidden="true"><div className="skeleton-poster" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div>; }
export function ErrorBox({ error, onRetry }) { return <div role="alert" className="notice border-red-400/30 bg-red-400/10"><p>{error?.message || error}</p>{onRetry && <button className="btn mt-3" onClick={onRetry}>ลองใหม่</button>}</div>; }
export function Empty({ children = 'ยังไม่มีข้อมูลในรายการนี้' }) { return <div className="empty-state"><span className="empty-icon"><Icon name="search" size={28} /></span><div className="muted">{children}</div></div>; }
export function Guard({ admin = false, children }) {
  const auth = useAuth(); const location = useLocation();
  if (!auth.ready) return <Loading />;
  if (auth.authError) return <ErrorBox error={auth.authError} onRetry={auth.retryAuth} />;
  if (!auth.isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && !auth.isAdmin) return <div className="panel my-10 text-center"><p className="text-6xl font-bold text-red-700 dark:text-red-400">403</p><h1 className="mt-4 text-xl">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</h1><Link className="btn mt-5" to="/">กลับหน้าแรก</Link></div>;
  return children;
}
export function ConfirmBox({ title, children, busy, onConfirm, onCancel }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4" role="dialog" aria-modal="true" aria-label={title}><div className="panel w-full max-w-md"><h2 className="text-xl font-semibold">{title}</h2><div className="my-4 text-neutral-700 dark:text-neutral-300">{children}</div><div className="flex justify-end gap-3"><button className="btn-secondary" disabled={busy} onClick={onCancel}>ยกเลิก</button><button className="btn-danger" disabled={busy} onClick={onConfirm}>{busy ? 'กำลังดำเนินการ…' : 'ยืนยัน'}</button></div></div></div>;
}
export function AnimeCard({ anime }) {
  const title = anime.titleTh || anime.title;
  const subtitle = [anime.titleJapanese, anime.title].find(text => text && text !== title);
  return <Link to={`/anime/${anime.id}`} className="anime-card">
    <div className="card-art"><Poster src={anime.poster} alt="" className="card-poster" /></div>
    <div className="card-info">
      <h3>{title}</h3>
      {subtitle && <p className="card-original-title">{subtitle}</p>}
      <p className="card-rating"><Icon name="star" size={14} fill="currentColor" /><strong>{anime.jikanScore ?? '—'}</strong><span>MAL</span><span className="meta-dot" /><span>{anime.year || 'ไม่ระบุปี'}</span><span>·</span><span>{anime.episodes ? `${anime.episodes} ตอน` : 'ไม่ระบุจำนวนตอน'}</span></p>
      <p className="card-meta">{(anime.genres?.length ? anime.genres : [anime.genre || 'ไม่ระบุแนว']).slice(0, 3).map(genre => <span key={genre}>{genreLabels[genre] || genre}</span>)}</p>
      <p className="card-member"><Icon name="heart" size={12} />{anime.memberRating != null ? `สมาชิกให้ ${anime.memberRating} / 10` : 'รอคะแนนจากสมาชิก'}</p>
    </div>
    <span className="card-open"><Icon name="chevron" size={17} /></span>
  </Link>;
}
