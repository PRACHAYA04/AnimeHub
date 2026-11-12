import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextSizeToggle from './TextSizeToggle';

beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-text-size'); });

test('cycles through text sizes, updates the root element and remembers the choice', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<TextSizeToggle />);
  const button = screen.getByRole('button', { name: /ขนาดตัวอักษร: ปกติ/ });
  expect(document.documentElement).not.toHaveAttribute('data-text-size');

  await user.click(button);
  expect(document.documentElement).toHaveAttribute('data-text-size', 'large');
  expect(button).toHaveAccessibleName(/ขนาดตัวอักษร: ใหญ่ /);

  await user.click(button);
  expect(document.documentElement).toHaveAttribute('data-text-size', 'xlarge');
  expect(localStorage.getItem('anime-center.text-size')).toBe('xlarge');
  unmount();

  render(<TextSizeToggle />);
  await user.click(screen.getByRole('button', { name: /ขนาดตัวอักษร: ใหญ่พิเศษ/ }));
  expect(document.documentElement).not.toHaveAttribute('data-text-size');
});
