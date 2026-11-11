import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Catalog from './Catalog';
import { getAnimeList } from '../api/backend';
jest.mock('../api/backend');
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ token: null }) }));
const anime = [{ id: 1, title: 'Frieren', genres: ['Fantasy'], genre: 'Fantasy', poster: '', jikanScore: 9.3 }, { id: 2, title: 'Monster', genres: ['Drama'], genre: 'Drama', poster: '', jikanScore: 9.0 }];
function mount() { return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Catalog /></MemoryRouter>); }
beforeEach(() => jest.clearAllMocks());
test('search and genre filters run locally without additional requests', async () => { getAnimeList.mockResolvedValue(anime); const user = userEvent.setup(); mount(); await screen.findByText('Frieren'); await user.selectOptions(screen.getByLabelText('แนวอนิเมะ'), 'Drama'); expect(screen.queryByText('Frieren')).not.toBeInTheDocument(); expect(screen.getByText('Monster')).toBeInTheDocument(); await user.type(screen.getByLabelText('ค้นหาอนิเมะ'), 'missing'); expect(screen.getByText(/ไม่พบอนิเมะ/)).toBeInTheDocument(); expect(getAnimeList).toHaveBeenCalledTimes(1); });
test('failed load can be retried successfully', async () => { getAnimeList.mockRejectedValueOnce(new Error('API unavailable')).mockResolvedValueOnce(anime); const user = userEvent.setup(); mount(); expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable'); await user.click(screen.getByRole('button', { name: 'ลองใหม่' })); expect(await screen.findByText('Frieren')).toBeInTheDocument(); expect(getAnimeList).toHaveBeenCalledTimes(2); });

test('quick genres stay in sync with the dropdown and empty results can be reset', async () => {
  getAnimeList.mockResolvedValue(anime);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  await user.click(screen.getByRole('button', { name: 'ดราม่า' }));
  expect(screen.getByLabelText('แนวอนิเมะ')).toHaveValue('Drama');
  expect(screen.queryByText('Frieren')).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('แนวอนิเมะ'), 'Fantasy');
  expect(screen.getByRole('button', { name: 'แฟนตาซี' })).toHaveAttribute('aria-pressed', 'true');
  await user.type(screen.getByLabelText('ค้นหาอนิเมะ'), 'missing');
  await user.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }));
  expect(screen.getByLabelText('ค้นหาอนิเมะ')).toHaveValue('');
  expect(screen.getByLabelText('แนวอนิเมะ')).toHaveValue('');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(screen.getByText('Monster')).toBeInTheDocument();
  expect(getAnimeList).toHaveBeenCalledTimes(1);
});

test('clearing a search keeps the chosen genre', async () => {
  getAnimeList.mockResolvedValue(anime);
  const user = userEvent.setup();
  mount();
  await screen.findByText('Frieren');
  await user.selectOptions(screen.getByLabelText('แนวอนิเมะ'), 'Fantasy');
  await user.type(screen.getByLabelText('ค้นหาอนิเมะ'), 'missing');
  await user.click(screen.getByRole('button', { name: 'ล้างคำค้นหา' }));
  expect(screen.getByLabelText('แนวอนิเมะ')).toHaveValue('Fantasy');
  expect(screen.getByText('Frieren')).toBeInTheDocument();
  expect(screen.queryByText('Monster')).not.toBeInTheDocument();
});

test('home ranks real catalog data and keeps discovery available during an API error', async () => {
  getAnimeList.mockResolvedValueOnce([
    { ...anime[1], poster: 'https://example.com/monster.jpg' },
    { ...anime[0], poster: 'https://example.com/frieren.jpg' },
  ]);
  const user = userEvent.setup();
  const view = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Catalog home /></MemoryRouter>);
  const rankings = await screen.findByRole('complementary', { name: 'อนิเมะคะแนนสูง' });
  await screen.findAllByText('Frieren');
  expect(rankings.querySelector('.ranking-item')).toHaveAttribute('href', '/anime/1');
  expect(view.container.querySelector('.hero-featured')).toHaveAttribute('href', '/anime/1');
  await user.click(screen.getByRole('button', { name: 'ดราม่า' }));
  expect(view.container.querySelector('.anime-grid')).not.toHaveTextContent('Frieren');
  expect(rankings).toHaveTextContent('Frieren');
  view.unmount();
  getAnimeList.mockRejectedValueOnce(new Error('API unavailable'));
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Catalog home /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
  expect(screen.getByRole('link', { name: 'เริ่มสำรวจ' })).toHaveAttribute('href', '#catalog');
});
