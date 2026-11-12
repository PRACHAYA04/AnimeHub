import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';

const storageKey = 'anime-center.theme';
let themeColor;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  themeColor = document.createElement('meta');
  themeColor.name = 'theme-color';
  document.head.appendChild(themeColor);
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  themeColor.remove();
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});

test('uses the reference-inspired light theme for a new visitor', () => {
  render(<ThemeToggle />);
  expect(document.documentElement).not.toHaveClass('dark');
  expect(screen.getByRole('button', { name: 'เปลี่ยนเป็นโหมดมืด' })).toBeEnabled();
  expect(themeColor).toHaveAttribute('content', '#fafafa');
});

test('restores a saved light preference', () => {
  localStorage.setItem(storageKey, 'light');
  document.documentElement.classList.add('dark');
  render(<ThemeToggle />);
  expect(document.documentElement).not.toHaveClass('dark');
  expect(screen.getByRole('button', { name: 'เปลี่ยนเป็นโหมดมืด' })).toBeEnabled();
  expect(themeColor).toHaveAttribute('content', '#fafafa');
});

test('switches with the keyboard and remembers the choice after remounting', async () => {
  const user = userEvent.setup();
  localStorage.setItem(storageKey, 'dark');
  const firstMount = render(<ThemeToggle />);
  await user.tab();
  await user.keyboard('{Enter}');
  expect(document.documentElement).not.toHaveClass('dark');
  expect(localStorage.getItem(storageKey)).toBe('light');
  expect(themeColor).toHaveAttribute('content', '#fafafa');

  firstMount.unmount();
  render(<ThemeToggle />);
  await user.click(screen.getByRole('button', { name: 'เปลี่ยนเป็นโหมดมืด' }));
  expect(document.documentElement).toHaveClass('dark');
  expect(localStorage.getItem(storageKey)).toBe('dark');
  expect(themeColor).toHaveAttribute('content', '#000000');
});

test('switches modes even when browser storage is blocked', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  const user = userEvent.setup();
  render(<ThemeToggle />);
  await user.click(screen.getByRole('button', { name: 'เปลี่ยนเป็นโหมดมืด' }));
  expect(document.documentElement).toHaveClass('dark');
  expect(screen.getByRole('button', { name: 'เปลี่ยนเป็นโหมดสว่าง' })).toBeEnabled();
});

test('applies preference changes from another tab', () => {
  localStorage.setItem(storageKey, 'dark');
  render(<ThemeToggle />);
  act(() => {
    localStorage.setItem(storageKey, 'light');
    window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
  });
  expect(document.documentElement).not.toHaveClass('dark');
  expect(screen.getByRole('button', { name: 'เปลี่ยนเป็นโหมดมืด' })).toBeEnabled();
});

test('falls back to light mode for an invalid saved preference', () => {
  localStorage.setItem(storageKey, 'invalid');
  render(<ThemeToggle />);
  expect(document.documentElement).not.toHaveClass('dark');
  expect(screen.getByRole('button', { name: 'เปลี่ยนเป็นโหมดมืด' })).toBeEnabled();
});
