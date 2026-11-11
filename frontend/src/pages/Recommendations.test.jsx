import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { getRecommendations } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { Guard } from '../components/UI';
import Recommendations from './Recommendations';

jest.mock('../api/backend');
jest.mock('../auth/AuthContext');

const profile = { wishlistCount: 2, ratedCount: 3, highRatedCount: 2, lowRatedCount: 1, genres: [{ name: 'Fantasy', weight: 7 }] };
const result = {
  mode: 'personalized', profile,
  items: [{ id: 10, title: 'A New Adventure', genres: ['Fantasy'], jikanScore: 8.9, matchedGenres: ['Fantasy'], affinityScore: 7, reasonType: 'interest' }],
};
const auth = token => ({ ready: true, isLoggedIn: true, token, member: { displayName: 'Anime Lover' } });

function LoginDestination() {
  const { state } = useLocation();
  return <p>Login destination: {state?.from}</p>;
}

function view() {
  return <MemoryRouter initialEntries={['/me/recommendations']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
    <Route path="/me/recommendations" element={<Guard><Recommendations /></Guard>} />
    <Route path="/login" element={<LoginDestination />} />
  </Routes></MemoryRouter>;
}

beforeEach(() => {
  jest.resetAllMocks();
  useAuth.mockReturnValue(auth('alice-token'));
});

test('fetches with the current token and explains the interest behind each result', async () => {
  getRecommendations.mockResolvedValue(result);
  render(view());
  expect(await screen.findByRole('heading', { name: 'A New Adventure' })).toBeInTheDocument();
  expect(getRecommendations).toHaveBeenCalledWith('alice-token');
  const card = screen.getByRole('heading', { name: 'A New Adventure' }).closest('article');
  expect(card).toHaveTextContent('เพราะคุณสนใจ แฟนตาซี');
  expect(within(card).getByRole('link')).toHaveAttribute('href', '/anime/10');
  expect(screen.getByRole('heading', { name: 'แนวที่คุณสนใจตอนนี้' })).toBeInTheDocument();
  expect(screen.queryByText('เริ่มค้นพบความชอบของคุณ')).not.toBeInTheDocument();
});

test('cold start is identified as MAL-based discovery rather than a personal match', async () => {
  getRecommendations.mockResolvedValue({ mode: 'popular', profile: { ...profile, wishlistCount: 0, highRatedCount: 0, ratedCount: 0, lowRatedCount: 0, genres: [] }, items: [{ ...result.items[0], reasonType: 'popular', matchedGenres: [], affinityScore: 0 }] });
  render(view());
  expect(await screen.findByText('เริ่มค้นพบความชอบของคุณ')).toBeInTheDocument();
  expect(screen.getByText(/ตอนนี้เลือกจากคะแนน MyAnimeList ก่อน/)).toBeInTheDocument();
  expect(screen.queryByText(/เพราะคุณสนใจ/)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'แนวที่คุณสนใจตอนนี้' })).not.toBeInTheDocument();
});

test('handles no remaining matches and allows retry after a failed request', async () => {
  getRecommendations.mockRejectedValueOnce(new Error('API unavailable')).mockResolvedValueOnce({ ...result, items: [] });
  const user = userEvent.setup();
  render(view());
  expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
  await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));
  expect(await screen.findByText('ยังไม่มีเรื่องใหม่ที่เหมาะกับความสนใจของคุณในตอนนี้')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'สำรวจอนิเมะทั้งหมด' })).toHaveAttribute('href', '/anime');
  expect(getRecommendations).toHaveBeenCalledTimes(2);
});

test('refresh reads updated recommendations and weights from the server', async () => {
  getRecommendations.mockResolvedValueOnce(result).mockResolvedValueOnce({ ...result, profile: { ...profile, genres: [{ name: 'Drama', weight: 3 }] }, items: [{ ...result.items[0], id: 20, title: 'A Different Story', matchedGenres: ['Drama'], affinityScore: 3 }] });
  const user = userEvent.setup();
  render(view());
  await screen.findByRole('heading', { name: 'A New Adventure' });
  await user.click(screen.getByRole('button', { name: 'อัปเดตคำแนะนำ' }));
  expect(await screen.findByRole('heading', { name: 'A Different Story' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'A New Adventure' })).not.toBeInTheDocument();
  expect(screen.getByText('ดราม่า', { selector: '.recommendation-reason strong' })).toBeInTheDocument();
  expect(getRecommendations).toHaveBeenCalledTimes(2);
});

test('late responses from a previous account do not overwrite the new account', async () => {
  let resolveAlice;
  getRecommendations.mockImplementation(token => token === 'alice-token'
    ? new Promise(resolve => { resolveAlice = resolve; })
    : Promise.resolve({ ...result, items: [{ ...result.items[0], title: 'Bob Recommendation' }] }));
  const rendered = render(view());
  useAuth.mockReturnValue(auth('bob-token'));
  rendered.rerender(view());
  await screen.findByRole('heading', { name: 'Bob Recommendation' });
  await act(async () => { resolveAlice(result); });
  expect(screen.getByRole('heading', { name: 'Bob Recommendation' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'A New Adventure' })).not.toBeInTheDocument();
});

test('guests are sent to login with the recommendation destination preserved', () => {
  useAuth.mockReturnValue({ ready: true, isLoggedIn: false });
  render(view());
  expect(screen.getByText('Login destination: /me/recommendations')).toBeInTheDocument();
  expect(getRecommendations).not.toHaveBeenCalled();
});
