import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnimeList, apiFetch } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { AnimeCard, Loading, ErrorBox, Empty } from '../components/UI';
import Icon from '../components/Icon';
import Poster from '../components/Poster';
import GenreFilter, { genreIcons } from '../components/GenreFilter';
import { genreLabels } from '../utils/genres';

const titleOf = anime => anime.titleTh || anime.title;

function DiscoveryHero({ items, status }) {
  const ranked = [...items].sort((a, b) => (b.jikanScore || 0) - (a.jikanScore || 0));
  const featured = ranked.find(anime => anime.poster);

  return <div className="discovery-grid">
    <section className="discovery-hero" aria-labelledby="discovery-title">
      {featured && <div className="hero-art" aria-hidden="true"><Poster src={featured.poster} loading="eager" /></div>}
      <div className="hero-grain" />
      <div className="hero-content"><p className="hero-eyebrow"><span />A LITTLE ESCAPE. A NEW STORY.</p><h1 id="discovery-title">อีกโลกหนึ่ง<br />กำลัง<span>รอคุณอยู่</span><span className="hero-period">.</span></h1><p className="hero-description">บางเรื่องทำให้ยิ้ม บางเรื่องอยู่ในใจไปอีกนาน<br className="hidden sm:block" />ค้นพบอนิเมะเรื่องต่อไป ในแบบที่เป็นคุณ</p><div className="hero-actions"><a href="#catalog" className="btn">เริ่มสำรวจ<Icon name="arrow" size={17} /></a><Link to="/me/wishlist" className="hero-wishlist"><Icon name="bookmark" size={17} />รายการของฉัน</Link></div><div className="hero-bottom"><span className="hero-bottom-line" />YOUR NEXT FAVORITE IS HERE</div></div>
      {featured && <Link to={`/anime/${featured.id}`} className="hero-featured"><span className="hero-featured-label"><Icon name="sparkle" size={12} />พบกับเรื่องคะแนนสูง</span><span className="hero-featured-title">{titleOf(featured)}<Icon name="arrowUpRight" size={19} /></span><span className="hero-featured-score"><Icon name="star" size={12} fill="currentColor" />{featured.jikanScore ?? '—'}<span>MyAnimeList</span></span></Link>}
      <span className="hero-corner" aria-hidden="true">01 — DISCOVER</span>
    </section>
    <aside className="discovery-sidebar" aria-label="อนิเมะคะแนนสูง">
      <div className="ranking-heading"><div><p className="eyebrow">THE COMMUNITY LOVES</p><h2>เรื่องที่ไม่ควรพลาด<span className="accent">.</span></h2></div><span className="ranking-icon"><Icon name="star" size={18} /></span></div>
      <p className="ranking-description">เลือกจากคะแนน MyAnimeList</p>
      <div className="ranking-list">{status === 'loading' ? [1, 2, 3].map(n => <div className="ranking-skeleton" key={n} aria-hidden="true" />) : ranked.slice(0, 3).map((anime, index) => <Link className="ranking-item" key={anime.id} to={`/anime/${anime.id}`}><span className={`ranking-number ${index === 0 ? 'first' : ''}`}>0{index + 1}</span><Poster src={anime.poster} className="ranking-poster" /><div className="ranking-info"><h3>{titleOf(anime)}</h3><p><Icon name="star" size={11} fill="currentColor" /><strong>{anime.jikanScore ?? '—'}</strong><span>·</span>{anime.year || 'ไม่ระบุปี'}</p></div><Icon name="chevron" size={14} className="ranking-chevron" /></Link>)}{status === 'error' && <p className="ranking-unavailable">เรื่องที่น่าสนใจกำลังรอคุณอยู่<br />ลองโหลดรายการด้านล่างอีกครั้ง</p>}{status === 'success' && ranked.length === 0 && <p className="ranking-unavailable">ยังไม่มีอนิเมะในคลัง<br />กลับมาค้นพบเรื่องใหม่ได้เร็ว ๆ นี้</p>}</div>
      <Link to="/anime" className="ranking-more">สำรวจอนิเมะทั้งหมด<Icon name="arrow" size={15} /></Link>
    </aside>
  </div>;
}

export default function Catalog({ home = false, wishlist = false }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [sort, setSort] = useState('rating');
  const resultsGrid = useRef(null);

  useLayoutEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const cards = [...(resultsGrid.current?.children || [])];
    const animations = cards.flatMap((card, index) => typeof card.animate === 'function' ? [card.animate(
      [{ opacity: 0, transform: 'translateY(16px) scale(.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
      { duration: 360, delay: Math.min(index, 9) * 28, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' }
    )] : []);
    return () => animations.forEach(animation => animation.cancel());
  }, [selectedGenres]);

  useEffect(() => {
    let ignore = false;
    setStatus('loading');
    setError(null);
    const promise = wishlist ? apiFetch('/api/me/wishlist', { token }).then(d => d.items) : getAnimeList();
    promise.then(data => { if (!ignore) { setItems(data); setStatus('success'); } }).catch(e => { if (!ignore) { setError(e); setStatus('error'); } });
    return () => { ignore = true; };
  }, [wishlist, token, retry]);

  const genres = useMemo(() => [...new Set([
    ...Object.keys(genreLabels),
    ...items.flatMap(a => a.genres || []).filter(Boolean).sort(),
  ])], [items]);
  const genreCounts = useMemo(() => items.reduce((counts, anime) => {
    new Set(anime.genres || []).forEach(g => { counts[g] = (counts[g] || 0) + 1; });
    return counts;
  }, Object.create(null)), [items]);
  const q = query.trim().toLowerCase();
  const hasSelectedGenres = selectedGenres.length > 0;
  const shown = items.filter(a => (!hasSelectedGenres || selectedGenres.some(genre => a.genres?.includes(genre))) && (!q || `${a.title} ${a.titleTh || ''} ${a.titleJapanese || ''}`.toLowerCase().includes(q)))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'year' ? (b.year || 0) - (a.year || 0) : (b.jikanScore || 0) - (a.jikanScore || 0));

  function toggleGenre(genre) {
    setSelectedGenres(current => !genre ? current.length ? [] : current
      : current.includes(genre) ? current.filter(selected => selected !== genre) : [...current, genre]);
  }

  function resetFilters() { setQuery(''); setSelectedGenres([]); }

  const selectedGenreNames = selectedGenres.map(genre => genreLabels[genre] || genre).join(' หรือ ');
  const emptyGenrePhrase = `${selectedGenres.length > 1 ? 'ในแนว' : 'แนว'}${selectedGenreNames}`;
  const emptyTitle = hasSelectedGenres ? selectedGenres.length > 1 ? 'ไม่พบอนิเมะในแนวที่เลือก' : 'ไม่พบอนิเมะแนวนี้'
    : wishlist && !q ? 'ยังไม่มีรายการ กดเพิ่มในหน้ารายละเอียดอนิเมะได้เลย'
    : q ? 'ไม่พบอนิเมะที่ตรงกับคำค้น' : 'ยังไม่มีอนิเมะในคอลเลกชันนี้';
  const emptyDescription = hasSelectedGenres
    ? q ? `ไม่พบอนิเมะ${emptyGenrePhrase}ที่ตรงกับคำค้น “${query.trim()}” ลองเปลี่ยนคำค้นหรือเลือกแนวอื่น`
      : `ยังไม่มีอนิเมะ${emptyGenrePhrase}ใน${wishlist ? 'รายการอยากดูของคุณ' : 'คอลเลกชันนี้'} ลองเลือกแนวอื่นได้เลย`
    : q ? `ไม่พบเรื่องที่ตรงกับ “${query.trim()}” ลองใช้คำค้นอื่น` : '';

  return <div className="catalog-page">
    {home && <><div className="discovery-intro"><p><span className="live-dot" />พื้นที่ของคนรักอนิเมะ</p><span>FIND YOUR NEXT OBSESSION</span></div><DiscoveryHero items={items} status={status} /><div className="discovery-promises"><span><Icon name="compass" size={16} />ค้นพบเรื่องใหม่ที่เป็นคุณ</span><span><Icon name="bookmark" size={16} />เก็บทุกเรื่องที่อยากดู</span><span><Icon name="heart" size={16} />แบ่งปันมุมมองกับคนคอเดียวกัน</span></div></>}
    <section id="catalog" className="catalog-section" aria-labelledby="catalog-title">
      <div className="catalog-heading"><div><p className="eyebrow">{wishlist ? 'SAVED FOR YOUR NEXT ESCAPE' : 'A WORLD OF STORIES'}</p>{home ? <h2 id="catalog-title" className="page-title">ค้นพบเรื่องโปรด<span className="accent">เรื่องใหม่</span></h2> : <h1 id="catalog-title" className="page-title">{wishlist ? 'รายการที่อยากดู' : 'โลกของอนิเมะ'}<span className="accent">.</span></h1>}<p className="catalog-description">{wishlist ? 'เก็บไว้ก่อน แล้วค่อยออกเดินทางไปด้วยกัน' : 'จากเรื่องที่ใคร ๆ ก็รัก ถึงเรื่องที่รอให้คุณค้นพบ'}</p></div>{status === 'success' && <span className="collection-count"><span>{items.length.toLocaleString('th-TH')}</span>เรื่องใน{wishlist ? 'รายการของคุณ' : 'คอลเลกชัน'}<Icon name="film" size={17} /></span>}</div>
      <div className="catalog-toolbar"><div className="catalog-search"><Icon name="search" size={19} /><input aria-label="ค้นหาอนิเมะ" placeholder="วันนี้อยากดูเรื่องอะไร? ค้นหาชื่ออนิเมะ…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" className="search-clear" aria-label="ล้างคำค้นหา" onClick={() => setQuery('')}><Icon name="close" size={15} /></button>}</div><div className="catalog-select sort-select"><Icon name="sliders" size={16} /><select aria-label="เรียงลำดับ" value={sort} onChange={e => setSort(e.target.value)}><option value="rating">คะแนน MAL สูงสุด</option><option value="year">ปีใหม่ที่สุด</option><option value="name">ชื่อ A–Z</option></select></div></div>
      <div className="genre-filter-heading"><p><Icon name="film" size={16} />เลือกแนวที่อยากดู</p><span>เลือกได้หลายแนว · แสดงเรื่องที่ตรงอย่างน้อยหนึ่งแนว · กดซ้ำเพื่อยกเลิก</span></div>
      <div className="catalog-filter-row">
        <GenreFilter genres={genres} labels={genreLabels} counts={genreCounts} total={items.length} values={selectedGenres} onChange={toggleGenre} countsReady={status === 'success'} />
        {status === 'success' && <p className="results-count" role="status"><span key={JSON.stringify(selectedGenres)} className="filter-result-label">{hasSelectedGenres && <><Icon name={selectedGenres.length > 1 ? 'sliders' : genreIcons[selectedGenres[0]] || 'film'} size={13} /><strong>{selectedGenres.length > 1 ? `เลือก ${selectedGenres.length} แนว` : selectedGenreNames}</strong><span className="meta-dot" /></>}{q || hasSelectedGenres ? `พบ ${shown.length} จาก ${items.length} เรื่อง` : `${shown.length} เรื่อง พร้อมให้ค้นพบ`}</span></p>}
      </div>
      {status === 'loading' ? <Loading /> : status === 'error' ? <ErrorBox error={error} onRetry={() => setRetry(n => n + 1)} /> : shown.length === 0 ? <Empty><p className="catalog-empty-title">{emptyTitle}</p>{emptyDescription && <p className="catalog-empty-description">{emptyDescription}</p>}{(query || hasSelectedGenres) && <button className="btn-secondary mt-5" onClick={resetFilters}>ล้างตัวกรอง<Icon name="close" size={14} /></button>}{wishlist && !query && !hasSelectedGenres && <Link className="btn mt-5" to="/anime">ค้นพบอนิเมะ<Icon name="arrow" size={16} /></Link>}</Empty> : <div ref={resultsGrid} className="anime-grid">{shown.map(a => <AnimeCard key={a.id} anime={a} />)}</div>}
    </section>
    {home && <section className="collection-banner"><span className="collection-banner-icon"><Icon name="bookmark" size={30} /></span><div><p className="eyebrow">GOOD STORIES ARE WORTH KEEPING</p><h2>เรื่องที่อยากดู ไม่ต้องจำคนเดียว<span className="accent">.</span></h2><p>สร้างลิสต์ของคุณ แล้วกลับมาเจอเรื่องโปรดได้ทุกเมื่อ</p></div><Link className="btn-secondary" to="/me/wishlist">ไปที่รายการของฉัน<Icon name="arrow" size={16} /></Link><span className="banner-decoration" aria-hidden="true">+</span></section>}
  </div>;
}
