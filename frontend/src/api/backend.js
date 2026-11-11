const BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => { throw new Error('เซิร์ฟเวอร์ไม่ได้ตอบเป็น JSON กรุณาตรวจสอบที่อยู่ API'); });
  if (!res.ok) {
    const err = new Error(data.error?.message ?? data.error ?? `ระบบตอบกลับ ${res.status}`);
    err.status = res.status;
    if (res.status === 401 && token) window.dispatchEvent(new Event('animehub:expired'));
    throw err;
  }
  return data;
}
export const getAnime = (id) => apiFetch(`/api/anime/${id}`);
export const getAnimeList = () => apiFetch('/api/anime').then(d => d.items);
export const getReviews = (id) => apiFetch(`/api/anime/${id}/reviews`).then(d => d.items);
export const getRecommendations = (token) => apiFetch('/api/me/recommendations', { token });
