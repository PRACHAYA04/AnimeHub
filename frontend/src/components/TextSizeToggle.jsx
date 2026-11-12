import { useEffect, useState } from 'react';

const STORAGE_KEY = 'anime-center.text-size';
const SIZES = [
  { id: 'normal', label: 'ปกติ' },
  { id: 'large', label: 'ใหญ่' },
  { id: 'xlarge', label: 'ใหญ่พิเศษ' },
];

function readSize() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SIZES.some(size => size.id === saved) ? saved : 'normal';
  } catch {
    return 'normal';
  }
}

export default function TextSizeToggle() {
  const [size, setSize] = useState(readSize);
  const index = SIZES.findIndex(item => item.id === size);
  const next = SIZES[(index + 1) % SIZES.length];
  const label = `ขนาดตัวอักษร: ${SIZES[index].label} (กดเพื่อเปลี่ยนเป็น${next.label})`;

  useEffect(() => {
    const root = document.documentElement;
    if (size === 'normal') root.removeAttribute('data-text-size');
    else root.setAttribute('data-text-size', size);
    try { localStorage.setItem(STORAGE_KEY, size); } catch { /* still works for this visit */ }
  }, [size]);

  return <button type="button" className="text-size-toggle" aria-label={label} title={label} onClick={() => setSize(next.id)}>
    <span className="text-size-glyph" aria-hidden="true"><small>ก</small>ก</span>
    <span className="text-size-level" aria-hidden="true">{SIZES.map((item, i) => <i key={item.id} className={i <= index ? 'is-on' : ''} />)}</span>
  </button>;
}
