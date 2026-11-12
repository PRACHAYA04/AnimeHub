import { splitForTranslation, translateToThai } from './translate';

const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

beforeEach(() => { localStorage.clear(); global.fetch = jest.fn(); });
afterEach(() => { delete global.fetch; });

test('splitting keeps paragraph breaks and respects the size limit', () => {
  const text = 'First sentence. Second sentence!\n\nThird one?';
  const pieces = splitForTranslation(text, 20);
  expect(pieces.join('')).toBe(text);
  expect(pieces).toContain('\n\n');
  expect(pieces.every(piece => piece.length <= 20)).toBe(true);
});

test('translates each paragraph with Google and caches the result', async () => {
  fetch.mockImplementation(url => ok([[[decodeURIComponent(url.split('q=')[1]) === 'Hello.' ? 'สวัสดี' : 'ลาก่อน', 'x']]]));
  await expect(translateToThai('Hello.\n\nBye.')).resolves.toBe('สวัสดี\n\nลาก่อน');
  expect(fetch).toHaveBeenCalledTimes(2);
  await expect(translateToThai('Hello.\n\nBye.')).resolves.toBe('สวัสดี\n\nลาก่อน');
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('falls back to MyMemory when Google fails', async () => {
  fetch.mockImplementation(url => url.includes('googleapis')
    ? Promise.resolve({ ok: false, status: 429 })
    : ok({ responseStatus: 200, responseData: { translatedText: 'สวัสดี' } }));
  await expect(translateToThai('Hello')).resolves.toBe('สวัสดี');
  expect(fetch.mock.calls.some(([url]) => url.includes('mymemory'))).toBe(true);
});

test('reports a friendly error when every service fails', async () => {
  fetch.mockResolvedValue({ ok: false, status: 500 });
  await expect(translateToThai('Hello')).rejects.toThrow('ยังแปลเรื่องย่อไม่ได้');
});
