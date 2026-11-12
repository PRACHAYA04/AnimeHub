import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Detail from './Detail';
import { getAnime, getReviews } from '../api/backend';
import { translateToThai } from '../api/translate';

jest.mock('../api/backend');
jest.mock('../api/translate');
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ token: null, member: null, isLoggedIn: false, isAdmin: false }) }));

const anime = { id: 7, title: 'Frieren', titleJapanese: '葬送のフリーレン', detail: 'An elf mage travels.', genres: ['Fantasy'], status: 'Finished Airing', year: 2023, episodes: 28, jikanScore: 9.3, memberRating: null, memberVoteCount: 0 };

function mount() {
  return render(<MemoryRouter initialEntries={['/anime/7']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/anime/:id" element={<Detail />} /></Routes></MemoryRouter>);
}

beforeEach(() => { jest.clearAllMocks(); getAnime.mockResolvedValue(anime); getReviews.mockResolvedValue([]); });

test('translate button switches the synopsis to Thai and back to the original', async () => {
  translateToThai.mockResolvedValue('เอลฟ์นักเวทออกเดินทาง');
  const user = userEvent.setup();
  mount();
  expect(await screen.findByText('An elf mage travels.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'Frieren' })).toBeInTheDocument();
  expect(screen.getByText('แฟนตาซี')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'แปลเป็นไทย' }));
  expect(await screen.findByText('เอลฟ์นักเวทออกเดินทาง')).toBeInTheDocument();
  expect(translateToThai).toHaveBeenCalledWith('An elf mage travels.', expect.objectContaining({ signal: expect.any(Object) }));
  expect(screen.getByRole('button', { name: 'แปลเป็นไทย' })).toHaveAttribute('aria-pressed', 'true');

  await user.click(screen.getByRole('button', { name: 'ต้นฉบับ' }));
  expect(screen.getByText('An elf mage travels.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'แปลเป็นไทย' }));
  expect(screen.getByText('เอลฟ์นักเวทออกเดินทาง')).toBeInTheDocument();
  expect(translateToThai).toHaveBeenCalledTimes(1);
});

test('translation failures show a retryable error and keep the original text', async () => {
  translateToThai.mockRejectedValueOnce(new Error('ยังแปลเรื่องย่อไม่ได้ในขณะนี้')).mockResolvedValueOnce('แปลแล้ว');
  const user = userEvent.setup();
  mount();
  await user.click(await screen.findByRole('button', { name: 'แปลเป็นไทย' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ยังแปลเรื่องย่อไม่ได้ในขณะนี้');
  expect(screen.getByText('An elf mage travels.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));
  expect(await screen.findByText('แปลแล้ว')).toBeInTheDocument();
});
