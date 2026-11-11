import { useEffect, useState } from 'react';

const STORAGE_KEY = 'anime-center.theme';

function readTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme);
  const isDark = theme === 'dark';
  const label = isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด';

  useEffect(() => {
    const root = document.documentElement;
    let transitionTimer;
    if (root.classList.contains('dark') !== (theme === 'dark')) {
      root.classList.add('theme-transition');
      transitionTimer = window.setTimeout(() => root.classList.remove('theme-transition'), 550);
    }
    root.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#000000' : '#fafafa');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
    return () => {
      window.clearTimeout(transitionTimer);
      root.classList.remove('theme-transition');
    };
  }, [theme]);

  useEffect(() => {
    function syncTheme(event) {
      if (event.key === STORAGE_KEY || event.key === null) setTheme(readTheme());
    }
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  return (
    <button type="button" className="icon-button theme-toggle" aria-label={label} title={label} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {isDark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></> : <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />}
      </svg>
    </button>
  );
}
