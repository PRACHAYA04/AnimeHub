import { onceADay } from './cache';
// Optional API lab only. The main catalog always reads the Go/PostgreSQL API.
export function getJikanSample() {
  return onceADay('animehub.jikan.sample', async () => {
    const response = await fetch('https://api.jikan.moe/v4/top/anime?sfw=true&limit=5');
    if (!response.ok) throw new Error(`Jikan ตอบกลับ ${response.status} กรุณารอสักครู่แล้วลองใหม่`);
    return (await response.json()).data;
  });
}
