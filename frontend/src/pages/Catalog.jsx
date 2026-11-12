import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnimeList, apiFetch } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { AnimeCard, Loading, ErrorBox, Empty } from '../components/UI';
import Icon from '../components/Icon';
import DiscoveryHero from '../components/DiscoveryHero';
import GenreFilter, { genreIcons } from '../components/GenreFilter';
import { genreLabels } from '../utils/genres';

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

  const previewLimited = home && !q && !hasSelectedGenres && shown.length > 8;
  const visibleItems = previewLimited ? shown.slice(0, 8) : shown;

  function toggleGenre(genre) {
    setSelectedGenres(current => !genre ? current.length ? [] : current
      : current.includes(genre) ? current.filter(selected => selected !== genre) : [...current, genre]);
  }

  function resetFilters() { setQuery(''); setSelectedGenres([]); }

  const resultsDescription = q || hasSelectedGenres ? `พบ ${shown.length} จาก ${items.length} เรื่อง`
    : previewLimited ? `แสดง 8 จาก ${shown.length} เรื่อง · ดูครบได้ที่อนิเมะทั้งหมด` : `${shown.length} เรื่อง พร้อมให้ค้นพบ`;

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
    {home && <DiscoveryHero items={items} status={status} query={query} onQueryChange={setQuery} />}
    <div className={home ? 'catalog-content site-container' : 'catalog-content'}>
    <section id="catalog" className="catalog-section" aria-labelledby="catalog-title">
      <div className="catalog-heading"><div><p className="eyebrow">{wishlist ? 'SAVED FOR YOUR NEXT ESCAPE' : 'A WORLD OF STORIES'}</p>{home ? <h2 id="catalog-title" className="page-title">อนิเมะที่น่าค้นพบ</h2> : <h1 id="catalog-title" className="page-title">{wishlist ? 'รายการที่อยากดู' : 'อนิเมะทั้งหมด'}</h1>}<p className="catalog-description">{wishlist ? 'เก็บไว้ก่อน แล้วค่อยออกเดินทางไปด้วยกัน' : 'จากเรื่องที่ใคร ๆ ก็รัก ถึงเรื่องที่รอให้คุณค้นพบ'}</p></div>{status === 'success' && <span className="collection-count"><span>{items.length.toLocaleString('th-TH')}</span>เรื่องใน{wishlist ? 'รายการของคุณ' : 'คอลเลกชัน'}<Icon name="film" size={17} /></span>}</div>
      <div className="catalog-toolbar"><div className="catalog-search"><Icon name="search" size={19} /><input aria-label="ค้นหาอนิเมะ" placeholder="วันนี้อยากดูเรื่องอะไร? ค้นหาชื่ออนิเมะ…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" className="search-clear" aria-label="ล้างคำค้นหา" onClick={() => setQuery('')}><Icon name="close" size={15} /></button>}</div><div className="catalog-select sort-select"><Icon name="sliders" size={16} /><select aria-label="เรียงลำดับ" value={sort} onChange={e => setSort(e.target.value)}><option value="rating">คะแนน MAL สูงสุด</option><option value="year">ปีใหม่ที่สุด</option><option value="name">ชื่อ A–Z</option></select></div></div>
      <div className="genre-filter-heading"><p><Icon name="film" size={16} />เลือกแนวที่อยากดู</p><span>เลือกได้หลายแนว · แสดงเรื่องที่ตรงอย่างน้อยหนึ่งแนว · กดซ้ำเพื่อยกเลิก</span></div>
      <div className="catalog-filter-row">
        <GenreFilter genres={genres} labels={genreLabels} counts={genreCounts} total={items.length} values={selectedGenres} onChange={toggleGenre} countsReady={status === 'success'} />
        {status === 'success' && <p className="results-count" role="status"><span key={JSON.stringify(selectedGenres)} className="filter-result-label">{hasSelectedGenres && <><Icon name={selectedGenres.length > 1 ? 'sliders' : genreIcons[selectedGenres[0]] || 'film'} size={13} /><strong>{selectedGenres.length > 1 ? `เลือก ${selectedGenres.length} แนว` : selectedGenreNames}</strong><span className="meta-dot" /></>}{resultsDescription}</span></p>}
      </div>
      {status === 'loading' ? <Loading /> : status === 'error' ? <ErrorBox error={error} onRetry={() => setRetry(n => n + 1)} /> : shown.length === 0 ? <Empty><p className="catalog-empty-title">{emptyTitle}</p>{emptyDescription && <p className="catalog-empty-description">{emptyDescription}</p>}{(query || hasSelectedGenres) && <button className="btn-secondary mt-5" onClick={resetFilters}>ล้างตัวกรอง<Icon name="close" size={14} /></button>}{wishlist && !query && !hasSelectedGenres && <Link className="btn mt-5" to="/anime">ค้นพบอนิเมะ<Icon name="arrow" size={16} /></Link>}</Empty> : <div ref={resultsGrid} className="anime-grid">{visibleItems.map(a => <AnimeCard key={a.id} anime={a} />)}</div>}
    </section>
    {status === 'success' && previewLimited && <Link className="catalog-view-all btn-secondary" to="/anime">ดูอนิเมะทั้งหมด {items.length} เรื่อง<Icon name="arrow" size={16} /></Link>}
    {home && <section className="collection-banner"><span className="collection-banner-icon"><Icon name="bookmark" size={30} /></span><div><p className="eyebrow">GOOD STORIES ARE WORTH KEEPING</p><h2>เรื่องที่อยากดู ไม่ต้องจำคนเดียว</h2><p>สร้างลิสต์ของคุณ แล้วกลับมาเจอเรื่องโปรดได้ทุกเมื่อ</p></div><Link className="btn-secondary" to="/me/wishlist">ไปที่รายการของฉัน<Icon name="arrow" size={16} /></Link><span className="banner-decoration" aria-hidden="true">+</span></section>}
    </div>
  </div>;
}
