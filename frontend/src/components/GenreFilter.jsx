import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

export const genreIcons = {
  Action: 'bolt', Adventure: 'compass', Fantasy: 'sparkle', Romance: 'heart',
  Comedy: 'smile', Drama: 'theater', Mystery: 'search', 'Sci-Fi': 'planet',
  Sports: 'star', Supernatural: 'sparkle', Horror: 'moon', Suspense: 'bolt',
};

export default function GenreFilter({ genres, labels, counts, total, values, onChange, countsReady = true }) {
  const container = useRef(null);
  const [highlights, setHighlights] = useState([]);
  const options = useMemo(() => [...new Set([...genres, ...values])], [genres, values]);

  useLayoutEffect(() => {
    const root = container.current;
    const active = [...root.querySelectorAll('[aria-pressed="true"]')];

    function measure() {
      const next = active.filter(button => button.offsetWidth).map(button => ({
        genre: button.dataset.genre, x: button.offsetLeft, y: button.offsetTop,
        width: button.offsetWidth, height: button.offsetHeight,
      }));
      setHighlights(current => current.length === next.length && next.every((position, index) => Object.keys(position).every(key => current[index][key] === position[key])) ? current : next);
    }

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(root);
    active.forEach(button => observer?.observe(button));
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [values, options]);

  function chip(genre) {
    const label = genre ? labels[genre] || genre : 'ทั้งหมด';
    const selected = genre ? values.includes(genre) : values.length === 0;
    return <button
      type="button" key={genre} data-genre={genre} className={`genre-chip ${selected ? 'selected' : ''}`}
      aria-label={label} aria-pressed={selected} onClick={() => onChange(genre)}
    >
      <Icon name={selected && genre ? 'check' : genreIcons[genre] || (genre ? 'film' : 'grid')} size={15} />
      <span>{label}</span>
      <span className="genre-chip-count" aria-hidden="true">{countsReady ? genre ? counts[genre] || 0 : total : '—'}</span>
    </button>;
  }

  return <div ref={container} className={`genre-chips ${highlights.length ? 'has-highlight' : ''}`} role="group" aria-label="เลือกแนวอย่างรวดเร็ว">
    {highlights.map(highlight => <span key={highlight.genre} data-genre={highlight.genre} className="genre-highlight" aria-hidden="true" style={{ transform: `translate(${highlight.x}px, ${highlight.y}px)`, width: highlight.width, height: highlight.height }} />)}
    {chip('')}
    {options.map(chip)}
  </div>;
}
