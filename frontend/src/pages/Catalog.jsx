import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnimeList, apiFetch } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { AnimeCard, Loading, ErrorBox, Empty } from '../components/UI';
import Icon from '../components/Icon';
import Poster from '../components/Poster';

const genreLabels = { Action: 'แอ็กชัน', Adventure: 'ผจญภัย', Comedy: 'คอเมดี้', Drama: 'ดราม่า', Fantasy: 'แฟนตาซี', Romance: 'โรแมนซ์', Mystery: 'ลึกลับ', 'Sci-Fi': 'ไซไฟ', 'Slice of Life': 'ชีวิตประจำวัน', Sports: 'กีฬา', Supernatural: 'เหนือธรรมชาติ', Suspense: 'ระทึกขวัญ', Horror: 'สยองขวัญ' };
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
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('rating');

  useEffect(() => {
    let ignore = false;
    setStatus('loading');
    setError(null);
    const promise = wishlist ? apiFetch('/api/me/wishlist', { token }).then(d => d.items) : getAnimeList();
    promise.then(data => { if (!ignore) { setItems(data); setStatus('success'); } }).catch(e => { if (!ignore) { setError(e); setStatus('error'); } });
    return () => { ignore = true; };
  }, [wishlist, token, retry]);

  const genres = [...new Set(items.flatMap(a => a.genres || []))].sort();
  const quickGenres = ['Action', 'Adventure', 'Fantasy', 'Romance', 'Comedy', 'Drama', 'Mystery', 'Sci-Fi'].filter(g => genres.includes(g)).slice(0, 6);
  const q = query.trim().toLowerCase();
  const shown = items.filter(a => (!genre || a.genres?.includes(genre)) && (!q || `${a.title} ${a.titleTh || ''} ${a.titleJapanese || ''}`.toLowerCase().includes(q)))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'year' ? (b.year || 0) - (a.year || 0) : (b.jikanScore || 0) - (a.jikanScore || 0));

  function resetFilters() { setQuery(''); setGenre(''); }

  return <div className="catalog-page">
    {home && <><div className="discovery-intro"><p><span className="live-dot" />พื้นที่ของคนรักอนิเมะ</p><span>FIND YOUR NEXT OBSESSION</span></div><DiscoveryHero items={items} status={status} /><div className="discovery-promises"><span><Icon name="compass" size={16} />ค้นพบเรื่องใหม่ที่เป็นคุณ</span><span><Icon name="bookmark" size={16} />เก็บทุกเรื่องที่อยากดู</span><span><Icon name="heart" size={16} />แบ่งปันมุมมองกับคนคอเดียวกัน</span></div></>}
    <section id="catalog" className="catalog-section" aria-labelledby="catalog-title">
      <div className="catalog-heading"><div><p className="eyebrow">{wishlist ? 'SAVED FOR YOUR NEXT ESCAPE' : 'A WORLD OF STORIES'}</p>{home ? <h2 id="catalog-title" className="page-title">ค้นพบเรื่องโปรด<span className="accent">เรื่องใหม่</span></h2> : <h1 id="catalog-title" className="page-title">{wishlist ? 'รายการที่อยากดู' : 'โลกของอนิเมะ'}<span className="accent">.</span></h1>}<p className="catalog-description">{wishlist ? 'เก็บไว้ก่อน แล้วค่อยออกเดินทางไปด้วยกัน' : 'จากเรื่องที่ใคร ๆ ก็รัก ถึงเรื่องที่รอให้คุณค้นพบ'}</p></div>{status === 'success' && <span className="collection-count"><span>{items.length.toLocaleString('th-TH')}</span>เรื่องใน{wishlist ? 'รายการของคุณ' : 'คอลเลกชัน'}<Icon name="film" size={17} /></span>}</div>
      <div className="catalog-toolbar"><div className="catalog-search"><Icon name="search" size={19} /><input aria-label="ค้นหาอนิเมะ" placeholder="วันนี้อยากดูเรื่องอะไร? ค้นหาชื่ออนิเมะ…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" className="search-clear" aria-label="ล้างคำค้นหา" onClick={() => setQuery('')}><Icon name="close" size={15} /></button>}</div><div className="catalog-select"><Icon name="sliders" size={16} /><select aria-label="แนวอนิเมะ" value={genre} onChange={e => setGenre(e.target.value)}><option value="">ทุกแนวอนิเมะ</option>{genres.map(g => <option key={g} value={g}>{genreLabels[g] || g}</option>)}</select></div><div className="catalog-select sort-select"><select aria-label="เรียงลำดับ" value={sort} onChange={e => setSort(e.target.value)}><option value="rating">คะแนน MAL สูงสุด</option><option value="year">ปีใหม่ที่สุด</option><option value="name">ชื่อ A–Z</option></select></div></div>
      <div className="catalog-filter-row"><div className="genre-chips" aria-label="เลือกแนวอย่างรวดเร็ว"><button type="button" className={`genre-chip ${!genre ? 'selected' : ''}`} aria-pressed={!genre} onClick={() => setGenre('')}><Icon name="grid" size={13} />ทั้งหมด</button>{quickGenres.map(g => <button type="button" key={g} className={`genre-chip ${genre === g ? 'selected' : ''}`} aria-pressed={genre === g} onClick={() => setGenre(g)}>{genreLabels[g] || g}</button>)}</div>{status === 'success' && <p className="results-count" role="status">{q || genre ? `พบ ${shown.length} จาก ${items.length} เรื่อง` : `${shown.length} เรื่อง พร้อมให้ค้นพบ`}</p>}</div>
      {status === 'loading' ? <Loading /> : status === 'error' ? <ErrorBox error={error} onRetry={() => setRetry(n => n + 1)} /> : shown.length === 0 ? <Empty>{wishlist && !query && !genre ? 'ยังไม่มีรายการ กดเพิ่มในหน้ารายละเอียดอนิเมะได้เลย' : 'ไม่พบอนิเมะ ลองเปลี่ยนคำค้นหรือแนว'}{(query || genre) && <button className="btn-secondary mt-5" onClick={resetFilters}>ล้างตัวกรอง<Icon name="close" size={14} /></button>}{wishlist && !query && !genre && <Link className="btn mt-5" to="/anime">ค้นพบอนิเมะ<Icon name="arrow" size={16} /></Link>}</Empty> : <div className="anime-grid">{shown.map(a => <AnimeCard key={a.id} anime={a} />)}</div>}
    </section>
    {home && <section className="collection-banner"><span className="collection-banner-icon"><Icon name="bookmark" size={30} /></span><div><p className="eyebrow">GOOD STORIES ARE WORTH KEEPING</p><h2>เรื่องที่อยากดู ไม่ต้องจำคนเดียว<span className="accent">.</span></h2><p>สร้างลิสต์ของคุณ แล้วกลับมาเจอเรื่องโปรดได้ทุกเมื่อ</p></div><Link className="btn-secondary" to="/me/wishlist">ไปที่รายการของฉัน<Icon name="arrow" size={16} /></Link><span className="banner-decoration" aria-hidden="true">+</span></section>}
  </div>;
}
