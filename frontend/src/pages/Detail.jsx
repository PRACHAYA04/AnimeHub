import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch, getAnime, getReviews } from '../api/backend';
import { translateToThai } from '../api/translate';
import { useAuth } from '../auth/AuthContext';
import { ErrorBox, Empty, ConfirmBox } from '../components/UI';
import ReviewForm from '../components/ReviewForm';
import Poster from '../components/Poster';
import Icon from '../components/Icon';
import { genreLabels } from '../utils/genres';

const statusLabels = { 'Finished Airing': 'ฉายจบแล้ว', 'Currently Airing': 'กำลังฉาย', 'Not yet aired': 'ยังไม่เริ่มฉาย' };
const thaiDate = (value) => new Date(value).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

function DetailSkeleton() {
  return <div className="detail-page" role="status" aria-label="กำลังโหลด">
    <span className="sr-only">กำลังโหลดรายละเอียดอนิเมะ</span>
    <div className="detail-hero detail-skeleton" aria-hidden="true"><div className="detail-hero-inner"><div className="skeleton-poster detail-poster" /><div className="detail-heading"><div className="skeleton-line" /><div className="skeleton-line short" /></div></div></div>
  </div>;
}

function Synopsis({ text }) {
  const [view, setView] = useState('original');
  const [translation, setTranslation] = useState(null);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const controller = useRef(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function showThai() {
    if (translation?.source === text) { setView('th'); return; }
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState('loading'); setError('');
    try {
      const result = await translateToThai(text, { signal: current.signal });
      if (current.signal.aborted) return;
      setTranslation({ source: text, text: result }); setView('th'); setState('idle');
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message); setState('error');
    }
  }

  const showingThai = view === 'th' && translation?.source === text;
  const loading = state === 'loading';

  return <section className="detail-card" aria-labelledby="synopsis-title">
    <header className="detail-card-header">
      <div><p className="eyebrow">SYNOPSIS</p><h2 id="synopsis-title">เรื่องย่อ</h2></div>
      {text && <div className="lang-switch" role="group" aria-label="ภาษาของเรื่องย่อ">
        <button type="button" aria-pressed={!showingThai} onClick={() => setView('original')}>ต้นฉบับ</button>
        <button type="button" aria-pressed={showingThai} onClick={showThai} disabled={loading} aria-busy={loading}>
          {loading ? <span className="spinner" aria-hidden="true" /> : <Icon name="translate" size={15} />}
          {loading ? 'กำลังแปล…' : 'แปลเป็นไทย'}
        </button>
      </div>}
    </header>
    {text
      ? <div key={showingThai ? 'th' : 'en'} className={`synopsis-text ${loading ? 'is-loading' : ''}`} lang={showingThai ? 'th' : 'en'} aria-live="polite">{showingThai ? translation.text : text}</div>
      : <p className="muted synopsis-empty">ยังไม่มีเรื่องย่อสำหรับเรื่องนี้</p>}
    {error && <p role="alert" className="synopsis-error"><span>{error}</span><button type="button" onClick={showThai}>ลองใหม่</button></p>}
    {showingThai && <p className="synopsis-note"><Icon name="translate" size={13} />แปลอัตโนมัติด้วยระบบแปลภาษา เนื้อหาอาจคลาดเคลื่อนจากต้นฉบับเล็กน้อย</p>}
  </section>;
}

export default function Detail() {
  const { id } = useParams(); const { token, member, isLoggedIn, isAdmin } = useAuth();
  const [anime, setAnime] = useState(null); const [reviews, setReviews] = useState([]); const [mine, setMine] = useState({ myVote: null, inWishlist: false });
  const [status, setStatus] = useState('loading'); const [error, setError] = useState(null); const [reviewError, setReviewError] = useState(null); const [mineError, setMineError] = useState(null); const [mineReady, setMineReady] = useState(false);
  const [retry, setRetry] = useState(0); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(null); const [edit, setEdit] = useState(null); const [remove, setRemove] = useState(null);

  useEffect(() => { let ignore = false; setStatus('loading'); setEdit(null); setMessage(null); getAnime(id).then(a => { if (!ignore) { setAnime(a); setStatus('success'); } }).catch(e => { if (!ignore) { setError(e); setStatus('error'); } }); return () => { ignore = true; }; }, [id, retry]);
  useEffect(() => { let ignore = false; setReviewError(null); getReviews(id).then(d => { if (!ignore) setReviews(d); }).catch(e => { if (!ignore) setReviewError(e); }); return () => { ignore = true; }; }, [id, retry]);
  useEffect(() => { let ignore = false; setMineReady(false); setMineError(null); setMine({ myVote: null, inWishlist: false }); if (!token) return undefined; apiFetch(`/api/anime/${id}/mine`, { token }).then(d => { if (!ignore) { setMine(d); setMineReady(true); } }).catch(e => { if (!ignore) setMineError(e); }); return () => { ignore = true; }; }, [id, token, retry]);
  useEffect(() => { if (!message) return undefined; const timer = setTimeout(() => setMessage(null), 3500); return () => clearTimeout(timer); }, [message]);

  const refresh = useCallback(async () => { const [a, rs] = await Promise.all([getAnime(id), getReviews(id)]); setAnime(a); setReviews(rs); setReviewError(null); }, [id]);
  async function action(fn, text) { setBusy(true); setMessage(null); try { await fn(); setMessage({ text, ok: true }); } catch (e) { setMessage({ text: e.message, ok: false }); } finally { setBusy(false); } }
  async function vote(score) { await apiFetch(`/api/anime/${id}/vote`, { method: score ? 'PUT' : 'DELETE', token, ...(score ? { body: { score } } : {}) }); setMine(m => ({ ...m, myVote: score })); await refresh(); }
  async function wishlist() { await apiFetch(`/api/me/wishlist/${id}`, { method: mine.inWishlist ? 'DELETE' : 'PUT', token }); setMine(m => ({ ...m, inWishlist: !m.inWishlist })); }
  async function saveReview(text) { await apiFetch(edit ? `/api/reviews/${edit.id}` : `/api/anime/${id}/reviews`, { method: edit ? 'PUT' : 'POST', body: { text }, token }); setEdit(null); await refresh(); setMessage({ text: 'บันทึกรีวิวแล้ว', ok: true }); }

  if (status === 'loading') return <DetailSkeleton />;
  if (status === 'error') return <ErrorBox error={error} onRetry={() => setRetry(n => n + 1)} />;

  const own = reviews.find(r => r.memberId === member?.id);
  const title = anime.titleTh || anime.title;
  const altTitles = [anime.title, anime.titleJapanese].filter(t => t && t !== title);
  const statusLabel = statusLabels[anime.status] || anime.status;
  const facts = [
    ['ชื่อเรื่อง', anime.title],
    ['ชื่อญี่ปุ่น', anime.titleJapanese, 'ja'],
    ['สถานะ', statusLabel],
    ['ปีที่ฉาย', anime.year],
    ['จำนวนตอน', anime.episodes && `${anime.episodes} ตอน`],
    ['อัปเดตข้อมูล', anime.syncedAt && thaiDate(anime.syncedAt)],
  ].filter(([, value]) => value);

  return <div className="detail-page">
    <Link to="/anime" className="detail-back"><Icon name="arrowLeft" size={16} />กลับไปสำรวจอนิเมะ</Link>

    <section className="detail-hero" aria-labelledby="detail-title">
      {anime.poster && <img className="detail-hero-backdrop" src={anime.poster} alt="" aria-hidden="true" />}
      <div className="detail-hero-inner">
        <Poster src={anime.poster} alt={title} loading="eager" className="detail-poster" />
        <div className="detail-heading">
          <div className="detail-badges">
            {statusLabel && <span className="detail-badge is-status"><span className="status-dot" />{statusLabel}</span>}
            <span className="detail-badge"><Icon name="calendar" size={14} />{anime.year || 'ไม่ระบุปี'}</span>
            <span className="detail-badge"><Icon name="tv" size={14} />{anime.episodes ? `${anime.episodes} ตอน` : 'ไม่ระบุจำนวนตอน'}</span>
          </div>
          <h1 id="detail-title" className="detail-title">{title}</h1>
          {altTitles.map(t => <p key={t} className="detail-alt-title" lang={t === anime.titleJapanese ? 'ja' : undefined}>{t}</p>)}
          {anime.genres?.length > 0 && <ul className="detail-genres" aria-label="แนวอนิเมะ">{anime.genres.map(g => <li key={g}>{genreLabels[g] || g}</li>)}</ul>}

          <dl className="detail-stats">
            <div><dt>คะแนน MAL</dt><dd><Icon name="star" size={18} fill="currentColor" className="stat-star" />{anime.jikanScore ?? '—'}</dd></div>
            <div><dt>คะแนนสมาชิก</dt><dd>{anime.memberRating ?? '—'}<small>/10</small></dd><span>{anime.memberVoteCount || 0} โหวต</span></div>
            <div><dt>รีวิว</dt><dd>{reviews.length}</dd><span>จากสมาชิก</span></div>
          </dl>

          <div className="detail-actions">
            {isLoggedIn
              ? <button type="button" className={mine.inWishlist ? 'btn-light is-active' : 'btn-light'} aria-pressed={mine.inWishlist} disabled={busy || !mineReady} onClick={() => action(wishlist, mine.inWishlist ? 'นำออกจากรายการอยากดูแล้ว' : 'เพิ่มในรายการอยากดูแล้ว')}>
                  <Icon name="bookmark" size={17} fill={mine.inWishlist ? 'currentColor' : 'none'} />{mine.inWishlist ? 'อยู่ในรายการอยากดู' : 'เพิ่มในรายการอยากดู'}
                </button>
              : <Link className="btn-light" to="/login"><Icon name="bookmark" size={17} />เข้าสู่ระบบเพื่อบันทึก</Link>}
            {anime.sourceUrl && <a className="btn-ghost-light" href={anime.sourceUrl} target="_blank" rel="noreferrer">MyAnimeList<Icon name="arrowUpRight" size={15} /></a>}
          </div>
        </div>
      </div>
    </section>

    <div className="detail-body">
      <div className="detail-main">
        <Synopsis key={id} text={anime.detail} />

        <section className="detail-card" aria-labelledby="reviews-title" data-reveal>
          <header className="detail-card-header">
            <div><p className="eyebrow">REVIEWS</p><h2 id="reviews-title">มุมมองจากสมาชิก <span className="muted">({reviews.length})</span></h2></div>
          </header>
          {reviewError ? <ErrorBox error={reviewError} onRetry={() => setRetry(n => n + 1)} />
            : reviews.length === 0 ? <Empty>ยังไม่มีรีวิว มาเป็นคนแรกที่แบ่งปันมุมมอง</Empty>
            : <ul className="review-list">{reviews.map(r => <li key={r.id} className="review-item">
                <span className="avatar" aria-hidden="true">{r.member.displayName?.slice(0, 1)}</span>
                <div className="review-body">
                  <div className="review-meta">
                    <strong>{r.member.displayName}</strong>
                    {r.memberId === member?.id && <span className="review-own">รีวิวของคุณ</span>}
                    {r.score && <span className="review-score"><Icon name="star" size={12} fill="currentColor" />{r.score}/10</span>}
                    <time dateTime={r.updatedAt}>{thaiDate(r.updatedAt)}</time>
                  </div>
                  {edit?.id === r.id
                    ? <div className="mt-4"><ReviewForm key={r.id} initialText={r.text} onSubmit={saveReview} onCancel={() => setEdit(null)} /></div>
                    : <p className="review-text">{r.text}</p>}
                  {(r.memberId === member?.id || isAdmin) && edit?.id !== r.id && <div className="review-actions">
                    {r.memberId === member?.id && <button type="button" onClick={() => setEdit(r)}><Icon name="edit" size={14} />แก้ไข</button>}
                    <button type="button" className="is-danger" onClick={() => setRemove(r)}><Icon name="trash" size={14} />ลบรีวิว</button>
                  </div>}
                </div>
              </li>)}</ul>}
          {isLoggedIn && !own && !reviewError && <div className="review-compose"><h3><Icon name="message" size={17} />เขียนรีวิวเรื่องนี้</h3><ReviewForm onSubmit={saveReview} /></div>}
          {!isLoggedIn && <div className="review-compose is-guest"><p className="muted">เข้าสู่ระบบเพื่อแบ่งปันมุมมองของคุณกับสมาชิกคนอื่น</p><Link className="btn" to="/login">เข้าสู่ระบบเพื่อเขียนรีวิว</Link></div>}
        </section>
      </div>

      <aside className="detail-side" data-reveal>
        <section className="detail-card" aria-labelledby="rate-title">
          <header className="detail-card-header"><div><p className="eyebrow">YOUR RATING</p><h2 id="rate-title">คะแนนของคุณ</h2></div>{mine.myVote && <span className="my-score">{mine.myVote}<small>/10</small></span>}</header>
          {isLoggedIn ? <>
            {mineError && <ErrorBox error={mineError} onRetry={() => setRetry(n => n + 1)} />}
            <div className="score-grid">{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <button type="button" aria-label={`ให้คะแนน ${n}`} aria-pressed={mine.myVote === n} key={n} disabled={busy || !mineReady} className={mine.myVote && n <= mine.myVote ? 'is-filled' : ''} onClick={() => action(() => vote(n), 'บันทึกคะแนนแล้ว')}>{n}</button>)}</div>
            <div className="score-footer"><span className="muted">แตะตัวเลขเพื่อให้คะแนน</span>{mine.myVote && <button type="button" disabled={busy} onClick={() => action(() => vote(null), 'ยกเลิกคะแนนแล้ว')}>ยกเลิกคะแนน</button>}</div>
            <Link className="recommendation-detail-link" to="/me/recommendations"><Icon name="sparkle" size={15} />ดูเรื่องที่คัดจากความชอบของคุณ<Icon name="arrow" size={15} /></Link>
          </> : <p className="muted side-note"><Link to="/login" className="accent">เข้าสู่ระบบ</Link> เพื่อให้คะแนนและเก็บรายการอยากดู</p>}
        </section>

        <section className="detail-card" aria-labelledby="info-title">
          <header className="detail-card-header"><div><p className="eyebrow">INFORMATION</p><h2 id="info-title">ข้อมูลอนิเมะ</h2></div></header>
          <dl className="fact-list">{facts.map(([label, value, lang]) => <div key={label}><dt>{label}</dt><dd lang={lang}>{value}</dd></div>)}</dl>
          <p className="fact-source">ข้อมูลจาก Jikan / MyAnimeList</p>
        </section>
      </aside>
    </div>

    {message && <div className={`toast ${message.ok ? '' : 'is-error'}`} role="status"><Icon name={message.ok ? 'check' : 'close'} size={16} />{message.text}</div>}
    {remove && <ConfirmBox title="ลบรีวิวนี้?" busy={busy} onCancel={() => setRemove(null)} onConfirm={() => action(async () => { await apiFetch(`/api/reviews/${remove.id}`, { method: 'DELETE', token }); setRemove(null); await refresh(); }, 'ลบรีวิวแล้ว')}>รีวิวนี้จะถูกลบถาวร</ConfirmBox>}
  </div>;
}
