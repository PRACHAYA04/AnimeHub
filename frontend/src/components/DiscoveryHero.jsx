import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import Poster from './Poster';

// Counts up to `value` once; the real value is always available to assistive tech via the label.
function CountUp({ value, decimals = 0, label }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!value || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof requestAnimationFrame !== 'function') { setShown(value); return undefined; }
    let frame; const start = performance.now(); const duration = 1400;
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <strong aria-label={label}><span aria-hidden="true">{shown.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span></strong>;
}

export default function DiscoveryHero({ items, status, query, onQueryChange }) {
  const ranked = [...items].sort((a, b) => (b.jikanScore || 0) - (a.jikanScore || 0));
  const search = query.trim().toLowerCase();
  const matches = search ? ranked.filter(anime => `${anime.title} ${anime.titleTh || ''} ${anime.titleJapanese || ''}`.toLowerCase().includes(search)) : ranked;

  const scored = items.filter(anime => anime.jikanScore);
  const average = scored.length ? scored.reduce((sum, anime) => sum + anime.jikanScore, 0) / scored.length : 0;
  const genreCount = new Set(items.flatMap(anime => anime.genres || [])).size;
  const wallPosters = ranked.filter(anime => anime.poster).slice(0, 18);
  const wallColumns = wallPosters.length >= 6 ? Array.from({ length: 6 }, (_, col) => wallPosters.filter((_, i) => i % 6 === col)) : [];

  function explore(event) {
    event.preventDefault();
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('catalog')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    document.querySelector('#catalog input')?.focus({ preventScroll: true });
  }

  return <section className="discovery-hero" aria-labelledby="discovery-title">
    <div className="hero-wall" aria-hidden="true">{wallColumns.map((column, col) => <div className="hero-wall-col" key={col}>{[...column, ...column].map((anime, i) => <Poster key={`${anime.id}-${i}`} src={anime.poster} />)}</div>)}</div>
    <div className="hero-inner site-container">
      <p className="hero-eyebrow"><Icon name="sparkle" size={14} />เรื่องราวดี ๆ เริ่มจากความชอบของคุณ</p>
      <h1 id="discovery-title">ค้นพบอนิเมะเรื่องต่อไป<span>ที่คุณจะหลงรัก</span></h1>
      <p className="hero-description">ค้นหา อ่านรีวิว และเก็บเรื่องที่อยากดูไว้ในที่เดียว</p>
      {status === 'success' && items.length > 0 && <div className="hero-stats">
        <div><CountUp value={items.length} label={`${items.length} เรื่อง`} /><span>เรื่องในคลัง</span></div>
        <div><CountUp value={genreCount} label={`${genreCount} แนว`} /><span>แนวให้เลือก</span></div>
        {average > 0 && <div><span className="is-gold"><CountUp value={average} decimals={2} label={`คะแนนเฉลี่ย ${average.toFixed(2)}`} /></span><span>คะแนนเฉลี่ย MAL</span></div>}
      </div>}
      <form className="hero-search" onSubmit={explore} role="search" aria-label="ค้นหาจากหน้าแรก">
        <span className="hero-search-label"><Icon name="film" size={19} />อนิเมะทั้งหมด</span>
        <input aria-label="ค้นหาอนิเมะจากหน้าแรก" placeholder="ค้นหาชื่ออนิเมะ เช่น Frieren, One Piece…" value={query} onChange={event => onQueryChange(event.target.value)} />
        <button className="hero-search-submit" type="submit" aria-label="ค้นหา"><Icon name="search" size={22} /><span>ค้นหา</span></button>
      </form>
      <aside className="hero-picks" aria-label={search ? 'ผลค้นหาเบื้องต้น' : 'อนิเมะคะแนนสูง'}>
        <div className="hero-picks-heading"><h2>{search ? 'เรื่องที่ตรงกับคำค้นของคุณ' : 'เริ่มจากเรื่องที่หลายคนหลงรัก'}</h2><span>{search ? `${matches.length} เรื่อง` : 'TOP RATED'}<Icon name={search ? 'search' : 'star'} size={12} /></span></div>
        <div className="hero-picks-grid">
          {status === 'loading' ? [1, 2, 3, 4].map(n => <div key={n} className="ranking-skeleton" aria-hidden="true" />) : matches.slice(0, 4).map((anime, index) => <Link to={`/anime/${anime.id}`} className={`ranking-item ${index === 0 ? 'hero-featured' : ''}`} key={anime.id}>
            <Poster src={anime.poster} className="ranking-poster" />
            <div className="ranking-info"><h3>{anime.titleTh || anime.title}</h3><p className="ranking-subtitle">{anime.titleJapanese || anime.title}</p><p><Icon name="star" size={12} fill="currentColor" /><strong>{anime.jikanScore ?? '—'}</strong><span>MAL</span><span>·</span><span>{anime.year || 'ไม่ระบุปี'}</span></p></div>
            <Icon name="chevron" size={15} className="ranking-chevron" />
          </Link>)}
        </div>
        {status === 'error' && <p className="ranking-unavailable">ยังโหลดรายการไม่ได้ ลองใหม่ได้ที่รายการด้านล่าง</p>}
        {status === 'success' && matches.length === 0 && <p className="ranking-unavailable">{search ? 'ยังไม่เจอเรื่องนี้ ลองค้นหาด้วยชื่ออื่นดูนะ' : 'ยังไม่มีอนิเมะในคลัง กลับมาค้นพบเรื่องใหม่ได้เร็ว ๆ นี้'}</p>}
        <a href="#catalog" className="btn hero-explore">เริ่มสำรวจ<Icon name="arrow" size={15} /></a>
      </aside>
      <p className="hero-footnote"><Icon name="heart" size={13} />ค้นหาและอ่านรีวิวได้เลย สมัครสมาชิกเมื่อต้องการเก็บเรื่องโปรด</p>
    </div>
  </section>;
}
