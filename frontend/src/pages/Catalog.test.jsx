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
