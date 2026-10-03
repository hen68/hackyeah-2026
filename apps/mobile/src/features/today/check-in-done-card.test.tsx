import { fireEvent, render, screen } from '@testing-library/react-native';

import { CheckInDoneCard } from '@/features/today/check-in-done-card';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

describe('CheckInDoneCard', () => {
  test('opens the day in the calendar', async () => {
    await render(<CheckInDoneCard day="2026-10-20" />);

    await fireEvent.press(screen.getByRole('button', { name: 'See today’s check-in' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/day/[date]',
      params: { date: '2026-10-20', from: 'calendar' },
    });
  });
});
