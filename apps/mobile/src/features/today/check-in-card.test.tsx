import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ADVANCE_DELAY_MS, CheckInCard } from '@/features/today/check-in-card';

const mockMutateAsync = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('@/features/today/hooks', () => ({
  useSubmitCheckin: () => ({ mutateAsync: mockMutateAsync, isPending: false, isError: false, error: null }),
}));

const SYMPTOMS = [
  { code: 'hot_flushes', label: 'Hot flushes' },
  { code: 'night_sweats', label: 'Night sweats' },
];

function renderCard(answered: Record<string, number> = {}, symptoms = SYMPTOMS) {
  return render(
    <CheckInCard
      patientId="p1"
      day="2026-10-20"
      isToday
      symptoms={symptoms}
      answered={answered}
      night={null}
    />,
  );
}

/** Taps an answer and waits out the pause that keeps it highlighted. */
async function pick(name: string) {
  await fireEvent.press(screen.getByRole('radio', { name }));
  await act(async () => {
    jest.advanceTimersByTime(ADVANCE_DELAY_MS);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockMutateAsync.mockReset().mockResolvedValue(undefined);
  mockPush.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CheckInCard', () => {
  test('shows no Back, Next or Submit buttons', async () => {
    await renderCard();
    expect(screen.getByText('1 of 2')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('picking an answer moves to the next question', async () => {
    await renderCard();
    await pick('3, Moderate');

    expect(screen.getByText('How much did you sweat at night?')).toBeOnTheScreen();
    expect(screen.getByText('2 of 2')).toBeOnTheScreen();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  test('the last answer saves everything and opens the success screen', async () => {
    await renderCard();
    await pick('2, Mild');
    await pick('4, Strong');

    expect(mockMutateAsync).toHaveBeenCalledWith({ answers: { hot_flushes: 2, night_sweats: 4 } });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/checkin-done',
      params: { day: '2026-10-20', minutes: '1' },
    });
  });

  test('editing a saved day starts at the first question and omits the time stat', async () => {
    await renderCard({ hot_flushes: 1, night_sweats: 2 });
    expect(screen.getByRole('radio', { name: '1, None' })).toBeSelected();

    await pick('1, None');
    await pick('5, Severe');

    expect(mockMutateAsync).toHaveBeenCalledWith({ answers: { hot_flushes: 1, night_sweats: 5 } });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/checkin-done', params: { day: '2026-10-20' } });
  });

  test('saves only once when the last answer is tapped twice quickly', async () => {
    let resolve = () => {};
    mockMutateAsync.mockImplementation(() => new Promise<void>((done) => (resolve = done)));
    await renderCard({ hot_flushes: 1 });
    await pick('1, None');

    await fireEvent.press(screen.getByRole('radio', { name: '2, Mild' }));
    await pick('3, Moderate');
    await act(async () => resolve());

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith({ answers: { hot_flushes: 1, night_sweats: 2 } });
  });

  test('does not navigate when saving fails', async () => {
    mockMutateAsync.mockRejectedValue(new Error('offline'));
    await renderCard({ hot_flushes: 1 });
    await pick('1, None');
    await pick('1, None');

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('keeps the picked answer highlighted until the next question opens', async () => {
    await renderCard();
    await fireEvent.press(screen.getByRole('radio', { name: '3, Moderate' }));

    expect(screen.getByRole('radio', { name: '3, Moderate' })).toBeSelected();
    expect(screen.getByText('1 of 2')).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(ADVANCE_DELAY_MS);
    });
    expect(screen.getByText('2 of 2')).toBeOnTheScreen();
  });

  test('shows an empty state when the plan has no symptoms', async () => {
    await renderCard({}, []);
    expect(screen.getByText('No questions yet')).toBeOnTheScreen();
  });
});
