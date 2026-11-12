// Client-side machine translation for synopses (source data is English from MyAnimeList).
// Primary: Google Translate's public web endpoint. Fallback: MyMemory (smaller per-request limit).
// Results are cached in localStorage so each synopsis is translated once per browser.
const CACHE_PREFIX = 'anime-center.translation.th.';
const GOOGLE_CHUNK = 1800;
const MYMEMORY_CHUNK = 450;

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// Split text into pieces no longer than `max`, keeping newline separators intact so the
// translated synopsis has the same paragraph layout as the original.
export function splitForTranslation(text, max) {
  const pieces = [];
  for (const part of text.split(/(\n+)/)) {
    if (!part) continue;
    if (/^\n+$/.test(part) || part.length <= max) { pieces.push(part); continue; }
    let current = '';
    for (const sentence of part.match(/[^.!?]+[.!?]*\s*/g) || [part]) {
      if (current && current.length + sentence.length > max) { pieces.push(current); current = ''; }
      if (sentence.length > max) {
        for (let i = 0; i < sentence.length; i += max) pieces.push(sentence.slice(i, i + max));
      } else current += sentence;
    }
    if (current) pieces.push(current);
  }
  return pieces;
}

async function googleTranslate(text, signal) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=th&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Google Translate ตอบกลับ ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data?.[0])) throw new Error('รูปแบบผลแปลไม่ถูกต้อง');
  return data[0].map(segment => segment?.[0] ?? '').join('');
}

async function myMemoryTranslate(text, signal) {
  const url = `https://api.mymemory.translated.net/get?langpair=en|th&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`MyMemory ตอบกลับ ${response.status}`);
  const data = await response.json();
  if (Number(data?.responseStatus) !== 200 || !data?.responseData?.translatedText) throw new Error(data?.responseDetails || 'บริการแปลไม่พร้อมใช้งาน');
  return data.responseData.translatedText;
}

async function translateWith(engine, text, max, signal) {
  const pieces = splitForTranslation(text, max);
  const translated = await Promise.all(pieces.map(piece => (piece.trim() ? engine(piece, signal) : piece)));
  return translated.join('');
}

export async function translateToThai(text, { signal } = {}) {
  const source = (text || '').trim();
  if (!source) return '';
  const key = CACHE_PREFIX + hash(source);
  try { const cached = localStorage.getItem(key); if (cached) return cached; } catch (_) {}

  let result;
  try {
    result = await translateWith(googleTranslate, source, GOOGLE_CHUNK, signal);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    try {
      result = await translateWith(myMemoryTranslate, source, MYMEMORY_CHUNK, signal);
    } catch (fallbackError) {
      if (fallbackError.name === 'AbortError') throw fallbackError;
      throw new Error('ยังแปลเรื่องย่อไม่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    }
  }
  try { localStorage.setItem(key, result); } catch (_) {}
  return result;
}
