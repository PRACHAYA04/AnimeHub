// Same daily localStorage cache pattern as the MovieHub API lab; never cache private user data.
export async function onceADay(key, fetcher) {
  const date = new Date().toISOString().slice(0, 10);
  try { const saved = JSON.parse(localStorage.getItem(key)); if (saved?.date === date) return saved.items; } catch (_) {}
  const items = await fetcher();
  try { localStorage.setItem(key, JSON.stringify({ date, items })); } catch (_) {}
  return items;
}
