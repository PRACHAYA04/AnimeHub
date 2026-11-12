import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecommendations } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { AnimeCard, Empty, ErrorBox, Loading } from '../components/UI';
import Icon from '../components/Icon';
import { genreIcons } from '../components/GenreFilter';
import { genreLabels } from '../utils/genres';

export default function Recommendations() {
  const { token, member } = useAuth();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let ignore = false;
    setStatus('loading');
    setData(null);
    setError(null);
    getRecommendations(token).then(result => {
      if (!ignore) { setData(result); setStatus('success'); }
    }).catch(err => {
      if (!ignore) { setError(err); setStatus('error'); }
    });
    return () => { ignore = true; };
  }, [token, retry]);

  const personalized = data?.mode === 'personalized';
  const profile = data?.profile;

  return <div className="recommendations-page">
    <header className="recommendation-hero">
      <div className="recommendation-intro">
        <p className="eyebrow">A LITTLE MORE YOU</p>
        <h1 className="page-title">แนะนำสำหรับคุณ</h1>
        <p className="recommendation-description">เรื่องต่อไปที่อาจกลายเป็นเรื่องโปรด<br />คัดจากแนวที่คุณสนใจและคะแนนที่คุณให้</p>
        <span className="recommendation-owner"><Icon name="user" size={14} />พื้นที่ค้นพบของ {member?.displayName || 'คุณ'}</span>
      </div>
      <div className="recommendation-orbit" aria-hidden="true"><span /><span /><Icon name="sparkle" size={55} /><p>YOUR TASTE<br /><strong>YOUR NEXT STORY</strong></p></div>
      {profile && <div className="recommendation-signals" aria-label="ข้อมูลที่ใช้แนะนำ"><div><Icon name="bookmark" size={18} /><strong>{profile.wishlistCount}</strong><span>เรื่องในรายการอยากดู</span></div><div><Icon name="star" size={18} /><strong>{profile.highRatedCount}</strong><span>เรื่องที่คุณให้ 8–10 คะแนน</span></div></div>}
    </header>

    {status === 'loading' ? <Loading /> : status === 'error' ? <ErrorBox error={error} onRetry={() => setRetry(n => n + 1)} /> : <>
      {profile.genres.length > 0 && <section className="taste-profile" aria-labelledby="taste-profile-title"><div><p className="eyebrow">YOUR CURRENT VIBE</p><h2 id="taste-profile-title">แนวที่คุณสนใจตอนนี้</h2></div><div className="taste-genres">{profile.genres.map((genre, index) => <span key={genre.name} className="taste-genre"><span className="taste-rank">0{index + 1}</span><Icon name={genreIcons[genre.name] || 'film'} size={15} />{genreLabels[genre.name] || genre.name}</span>)}</div></section>}

      {!personalized && data.items.length > 0 && <aside className="recommendation-notice"><span><Icon name="compass" size={23} /></span><div><h2>{profile.genres.length ? 'ลองเปิดประตูไปสู่แนวใหม่' : 'เริ่มค้นพบความชอบของคุณ'}</h2><p>{profile.genres.length ? 'ยังไม่มีเรื่องใหม่ที่ตรงกับแนวที่คุณสนใจ เราเลยคัดเรื่องคะแนนสูงมาให้ลองสำรวจ' : 'ตอนนี้เลือกจากคะแนน MyAnimeList ก่อน ลองเก็บเรื่องที่อยากดูหรือให้คะแนนเรื่องที่ชอบ เพื่อให้คำแนะนำเป็นคุณมากขึ้น'}</p></div><Link to="/anime" className="btn-secondary">สำรวจอนิเมะ<Icon name="arrow" size={15} /></Link></aside>}

      <section aria-labelledby="recommendation-results-title">
        <div className="recommendation-results-heading"><div><p className="eyebrow">{personalized ? 'PICKED AROUND YOUR INTERESTS' : 'A PLACE TO START'}</p><h2 id="recommendation-results-title">{personalized ? 'คัดมาให้คุณโดยเฉพาะ' : 'เรื่องใหม่ที่น่าลอง'}<span className="recommendation-total">{data.items.length} เรื่อง</span></h2></div><button type="button" className="btn-secondary recommendation-refresh" onClick={() => setRetry(n => n + 1)}><Icon name="refresh" size={15} />อัปเดตคำแนะนำ</button></div>
        {data.items.length === 0 ? <Empty><p>ยังไม่มีเรื่องใหม่ที่เหมาะกับความสนใจของคุณในตอนนี้</p><p className="mt-2">ลองสำรวจแนวอื่น หรือกลับมาเมื่อมีอนิเมะเพิ่มเติม</p><Link className="btn mt-5" to="/anime">สำรวจอนิเมะทั้งหมด<Icon name="arrow" size={16} /></Link></Empty> : <div className="anime-grid recommendation-grid">{data.items.map(anime => <article className="recommendation-card" key={anime.id}><AnimeCard anime={anime} /><div className="recommendation-reason"><Icon name={anime.reasonType === 'interest' ? 'sparkle' : 'star'} size={14} /><p>{anime.reasonType === 'interest' ? <>เพราะคุณสนใจ <strong>{anime.matchedGenres.map(genre => genreLabels[genre] || genre).join(' · ')}</strong></> : anime.jikanScore != null ? 'เรื่องคะแนน MAL สูงที่คุณยังไม่ได้เก็บหรือให้คะแนน' : 'เรื่องใหม่สำหรับเริ่มสำรวจความชอบของคุณ'}</p></div></article>)}</div>}
      </section>

      <details className="recommendation-method"><summary><Icon name="sliders" size={17} /><span>เลือกเรื่องแนะนำอย่างไร?</span><Icon name="chevron" size={15} /></summary><div className="recommendation-method-content"><div><Icon name="bookmark" /><h3>เริ่มจากเรื่องที่อยากดู</h3><p>แนวในรายการอยากดูช่วยบอกว่าคุณสนใจเรื่องแบบไหน</p></div><div><Icon name="heart" /><h3>เรียนรู้จากคะแนนของคุณ</h3><p>คะแนน 8–10 เพิ่มน้ำหนักแนวนั้น คะแนน 1–4 ลดน้ำหนัก ส่วน 5–7 เป็นกลาง</p></div><div><Icon name="compass" /><h3>เปิดทางให้เรื่องใหม่</h3><p>ตัดเรื่องที่คุณเก็บหรือให้คะแนนแล้วออก เรียงความสนใจก่อน แล้วใช้คะแนน MAL เมื่ออันดับเท่ากัน</p></div></div><p className="recommendation-method-note">คำนวณใหม่จากข้อมูลบัญชีของคุณเมื่อเปิดหรืออัปเดตหน้านี้ เหตุผลที่แนะนำอาจเปลี่ยนเมื่อคุณเพิ่ม ลบ หรือแก้คะแนนและรายการอยากดู</p></details>
    </>}
  </div>;
}
