import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Catalog from './Catalog';
import { getAnimeList, apiFetch } from '../api/backend';

jest.mock('../api/backend');
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ token: null }) }));

const anime = [
  { id: 1, title: 'Frieren', genres: ['Fantasy'], genre: 'Fantasy', poster: '', jikanScore: 9.3 },
  { id: 2, title: 'Monster', genres: ['Drama'], genre: 'Drama', poster: '', jikanScore: 9.0 },
];

function mount(props = {}) {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Catalog {...props} /></MemoryRouter>);
}

beforeEach(() => jest.clearAllMocks());

test('search and genre buttons filter locally without a genre dropdown or additional requests', async () => {
  getAnimeList.mockResolvedValue(anime);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  expect(screen.queryByRole('combobox', { name: 'แนวอนิเมะ' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ดราม่า' }));
  expect(screen.queryByText('Frieren')).not.toBeInTheDocument();
  expect(screen.getByText('Monster')).toBeInTheDocument();
  await user.type(screen.getByLabelText('ค้นหาอนิเมะ'), 'missing');
  expect(screen.getByText('ไม่พบอนิเมะแนวนี้')).toBeInTheDocument();
  expect(screen.getByText(/แนวดราม่าที่ตรงกับคำค้น “missing”/)).toBeInTheDocument();
  expect(getAnimeList).toHaveBeenCalledTimes(1);
});

test('failed loads stay distinct from an empty genre and can be retried', async () => {
  getAnimeList.mockRejectedValueOnce(new Error('API unavailable')).mockResolvedValueOnce(anime);
  const user = userEvent.setup();
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
  expect(screen.getByRole('button', { name: 'แฟนตาซี' })).toHaveTextContent('—');
  await user.click(screen.getByRole('button', { name: 'แฟนตาซี' }));
  expect(screen.queryByText('ไม่พบอนิเมะแนวนี้')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('API unavailable');
  await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));
  expect(await screen.findByText('Frieren')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'แฟนตาซี' })).toHaveTextContent('1');
  expect(getAnimeList).toHaveBeenCalledTimes(2);
});

test('multiple selected genres stay visible and empty search results can be reset to all', async () => {
  getAnimeList.mockResolvedValue(anime);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  await user.click(screen.getByRole('button', { name: 'ดราม่า' }));
  expect(screen.getByRole('button', { name: 'ดราม่า' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByText('Frieren')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'แฟนตาซี' }));
  expect(screen.getByRole('button', { name: 'แฟนตาซี' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'ดราม่า' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'ทั้งหมด' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(screen.getByText('Monster')).toBeInTheDocument();
  await user.type(screen.getByLabelText('ค้นหาอนิเมะ'), 'missing');
  await user.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }));
  expect(screen.getByLabelText('ค้นหาอนิเมะ')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'ทั้งหมด' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(screen.getByText('Monster')).toBeInTheDocument();
  expect(getAnimeList).toHaveBeenCalledTimes(1);
});

test('clearing a search keeps the chosen genre', async () => {
  getAnimeList.mockResolvedValue(anime);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  await user.click(screen.getByRole('button', { name: 'แฟนตาซี' }));
  await user.type(screen.getByLabelText('ค้นหาอนิเมะ'), 'missing');
  await user.click(screen.getByRole('button', { name: 'ล้างคำค้นหา' }));
  expect(screen.getByRole('button', { name: 'แฟนตาซี' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(screen.queryByText('Monster')).not.toBeInTheDocument();
});

test('all standard genres and extra genres from data are buttons with keyboard support', async () => {
  getAnimeList.mockResolvedValue([...anime, { id: 3, title: 'Space Story', genres: ['Sci-Fi', 'Music'] }]);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  const filters = screen.getByRole('group', { name: 'เลือกแนวอย่างรวดเร็ว' });
  expect(within(filters).getByRole('button', { name: 'ทั้งหมด' })).toHaveTextContent('3');
  expect(within(filters).getByRole('button', { name: 'สยองขวัญ' })).toHaveTextContent('0');
  expect(within(filters).getByRole('button', { name: 'กีฬา' })).toBeEnabled();
  const sciFi = within(filters).getByRole('button', { name: 'ไซไฟ' });
  sciFi.focus();
  await user.keyboard('{Enter}');
  expect(sciFi).toHaveFocus();
  expect(sciFi).toHaveAttribute('aria-pressed', 'true');
  expect(sciFi).toHaveTextContent('1');
  expect(screen.getByText('Space Story')).toBeInTheDocument();
  expect(screen.queryByText('Frieren')).not.toBeInTheDocument();
  await user.click(within(filters).getByRole('button', { name: 'Music' }));
  expect(screen.getByText('Space Story')).toBeInTheDocument();
  expect(sciFi).toHaveAttribute('aria-pressed', 'true');
  expect(within(filters).getByRole('button', { name: 'Music' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByText('Space Story')).toHaveLength(1);
  const all = within(filters).getByRole('button', { name: 'ทั้งหมด' });
  all.focus();
  await user.keyboard('{Enter}');
  expect(all).toHaveFocus();
  expect(all).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(getAnimeList).toHaveBeenCalledTimes(1);
});

test('rapid toggles preserve other choices and the search without making requests', async () => {
  getAnimeList.mockResolvedValue(anime);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  const drama = screen.getByRole('button', { name: 'ดราม่า' });
  const fantasy = screen.getByRole('button', { name: 'แฟนตาซี' });
  await user.click(drama);
  await user.click(fantasy);
  await user.click(drama);
  expect(drama).toHaveFocus();
  expect(drama).toHaveAttribute('aria-pressed', 'false');
  expect(fantasy).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(screen.queryByText('Monster')).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('ค้นหาอนิเมะ'), 'Frieren');
  await user.click(drama);
  expect(drama).toHaveAttribute('aria-pressed', 'true');
  expect(fantasy).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('ค้นหาอนิเมะ')).toHaveValue('Frieren');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(screen.queryByText('Monster')).not.toBeInTheDocument();
  expect(getAnimeList).toHaveBeenCalledTimes(1);
});

test('home ranks real catalog data and keeps discovery available during an API error', async () => {
  getAnimeList.mockResolvedValueOnce([
    { ...anime[1], poster: 'https://example.com/monster.jpg' },
    { ...anime[0], poster: 'https://example.com/frieren.jpg' },
  ]);
  const user = userEvent.setup();
  const view = mount({ home: true });
  const rankings = screen.getByRole('complementary', { name: 'อนิเมะคะแนนสูง' });
  await screen.findAllByText('Frieren');
  expect(rankings.querySelector('.ranking-item')).toHaveAttribute('href', '/anime/1');
  expect(view.container.querySelector('.hero-featured')).toHaveAttribute('href', '/anime/1');
  await user.click(screen.getByRole('button', { name: 'ดราม่า' }));
  expect(view.container.querySelector('.anime-grid')).not.toHaveTextContent('Frieren');
  expect(rankings).toHaveTextContent('Frieren');
  view.unmount();
  getAnimeList.mockRejectedValueOnce(new Error('API unavailable'));
  mount({ home: true });
  expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
  expect(screen.getByRole('link', { name: 'เริ่มสำรวจ' })).toHaveAttribute('href', '#catalog');
});

test('an empty catalog still offers clickable genres with zero counts', async () => {
  getAnimeList.mockResolvedValue([]);
  const user = userEvent.setup();
  mount();
  await screen.findByText('ยังไม่มีอนิเมะในคอลเลกชันนี้');
  const fantasy = screen.getByRole('button', { name: 'แฟนตาซี' });
  expect(fantasy).toHaveTextContent('0');
  expect(fantasy).toBeEnabled();
  expect(screen.getByRole('button', { name: 'แอ็กชัน' })).toHaveTextContent('0');
  expect(screen.getByRole('button', { name: 'โรแมนซ์' })).toHaveTextContent('0');
  await user.click(fantasy);
  expect(fantasy).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('ไม่พบอนิเมะแนวนี้')).toBeInTheDocument();
  expect(screen.getByText(/ยังไม่มีอนิเมะแนวแฟนตาซีในคอลเลกชันนี้/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ทั้งหมด' }));
  expect(screen.getByText('ยังไม่มีอนิเมะในคอลเลกชันนี้')).toBeInTheDocument();
  expect(getAnimeList).toHaveBeenCalledTimes(1);
});

test('a zero-count genre shows the empty message and other genres restore matching cards', async () => {
  getAnimeList.mockResolvedValue(anime);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  const horror = screen.getByRole('button', { name: 'สยองขวัญ' });
  expect(horror).toHaveTextContent('0');
  await user.click(horror);
  expect(horror).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('ไม่พบอนิเมะแนวนี้')).toBeInTheDocument();
  expect(screen.getByText(/ยังไม่มีอนิเมะแนวสยองขวัญในคอลเลกชันนี้/)).toBeInTheDocument();
  expect(screen.queryByText('Frieren')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'แฟนตาซี' }));
  expect(horror).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'แฟนตาซี' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(screen.queryByText('ไม่พบอนิเมะแนวนี้')).not.toBeInTheDocument();
  expect(screen.queryByText('Monster')).not.toBeInTheDocument();
});

test('an empty wishlist keeps genre buttons and explains that it has no saved matches', async () => {
  apiFetch.mockResolvedValue({ items: [] });
  const user = userEvent.setup();
  mount({ wishlist: true });
  await screen.findByText('ยังไม่มีรายการ กดเพิ่มในหน้ารายละเอียดอนิเมะได้เลย');
  await user.click(screen.getByRole('button', { name: 'แฟนตาซี' }));
  expect(screen.getByText('ไม่พบอนิเมะแนวนี้')).toBeInTheDocument();
  expect(screen.getByText(/ยังไม่มีอนิเมะแนวแฟนตาซีในรายการอยากดูของคุณ/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ดราม่า' }));
  expect(screen.getByText('ไม่พบอนิเมะในแนวที่เลือก')).toBeInTheDocument();
  expect(screen.getByText(/แฟนตาซี หรือ ดราม่าในรายการอยากดูของคุณ/)).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledTimes(1);
});

test('matches any selected genre without duplicates and deselecting the last genre restores all', async () => {
  getAnimeList.mockResolvedValue([...anime,
    { id: 3, title: 'Shared Story', genres: ['Fantasy', 'Drama'] },
    { id: 4, title: 'Action Story', genres: ['Action'] },
  ]);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  const fantasy = screen.getByRole('button', { name: 'แฟนตาซี' });
  const drama = screen.getByRole('button', { name: 'ดราม่า' });
  const all = screen.getByRole('button', { name: 'ทั้งหมด' });
  await user.click(fantasy);
  await user.click(drama);
  expect(fantasy).toHaveAttribute('aria-pressed', 'true');
  expect(drama).toHaveAttribute('aria-pressed', 'true');
  expect(all).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(screen.getByText('Monster')).toBeInTheDocument();
  expect(screen.getAllByText('Shared Story')).toHaveLength(1);
  expect(screen.queryByText('Action Story')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('เลือก 2 แนวพบ 3 จาก 4 เรื่อง');
  await user.click(fantasy);
  expect(screen.queryByText('Frieren')).not.toBeInTheDocument();
  expect(screen.getByText('Monster')).toBeInTheDocument();
  expect(screen.getByText('Shared Story')).toBeInTheDocument();
  await user.click(drama);
  expect(all).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Action Story')).toBeInTheDocument();
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(getAnimeList).toHaveBeenCalledTimes(1);
});

test('multi-genre selection works with search and sorting, and All clears only genres', async () => {
  getAnimeList.mockResolvedValue([...anime, { id: 3, title: 'Action Story', genres: ['Action'] }]);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  await user.click(screen.getByRole('button', { name: 'แฟนตาซี' }));
  await user.click(screen.getByRole('button', { name: 'ดราม่า' }));
  await user.selectOptions(screen.getByLabelText('เรียงลำดับ'), 'name');
  expect(screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)).toEqual(['Frieren', 'Monster']);
  await user.type(screen.getByLabelText('ค้นหาอนิเมะ'), 'Monster');
  expect(screen.getByText('Monster')).toBeInTheDocument();
  expect(screen.queryByText('Frieren')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ทั้งหมด' }));
  expect(screen.getByLabelText('ค้นหาอนิเมะ')).toHaveValue('Monster');
  expect(screen.getByLabelText('เรียงลำดับ')).toHaveValue('name');
  expect(screen.getByRole('button', { name: 'แฟนตาซี' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'ดราม่า' })).toHaveAttribute('aria-pressed', 'false');
  await user.click(screen.getByRole('button', { name: 'ล้างคำค้นหา' }));
  expect(screen.getByText('Action Story')).toBeInTheDocument();
  expect(getAnimeList).toHaveBeenCalledTimes(1);
});

test('multiple zero-count genres give a clear empty message and can be toggled with the keyboard', async () => {
  getAnimeList.mockResolvedValue(anime);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  const horror = screen.getByRole('button', { name: 'สยองขวัญ' });
  const sports = screen.getByRole('button', { name: 'กีฬา' });
  horror.focus();
  await user.keyboard(' ');
  sports.focus();
  await user.keyboard('{Enter}');
  expect(horror).toHaveAttribute('aria-pressed', 'true');
  expect(sports).toHaveAttribute('aria-pressed', 'true');
  expect(sports).toHaveFocus();
  expect(screen.getByText('ไม่พบอนิเมะในแนวที่เลือก')).toBeInTheDocument();
  expect(screen.getByText(/สยองขวัญ หรือ กีฬาในคอลเลกชันนี้/)).toBeInTheDocument();
  await user.keyboard('{Enter}');
  expect(sports).toHaveAttribute('aria-pressed', 'false');
  expect(horror).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('ไม่พบอนิเมะแนวนี้')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }));
  expect(screen.getByRole('button', { name: 'ทั้งหมด' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
});
