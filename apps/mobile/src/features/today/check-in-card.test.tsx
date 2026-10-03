import { fireEvent, render, screen } from '@testing-library/react-native';

import { CheckInCard } from '@/features/today/check-in-card';

const mockMutate = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/today/hooks', () => ({
  useSubmitCheckin: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null }),
}));

const SYMPTOMS = [
  { code: 'hot_flushes', label: 'Hot flushes' },
  { code: 'night_sweats', label: 'Night sweats' },
];

function renderCard(answered: Record<string, number> = {}) {
  return render(
    <CheckInCard
      patientId="p1"
      day="2026-10-20"
      isToday
      symptoms={SYMPTOMS}
      answered={answered}
      initialNote=""
      night={null}
    />,
  );
}

beforeEach(() => {
  mockMutate.mockReset();
  mockPush.mockReset();
});

describe('CheckInCard', () => {
  test('picking an answer moves to the next question and Back returns with it kept', async () => {
    await renderCard();
    expect(screen.getByText('Question 1 of 2')).toBeOnTheScreen();
    expect(screen.getByText('2 to go')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: '3, Moderate' }));

    expect(screen.getByText('How much did you sweat at night?')).toBeOnTheScreen();
    expect(screen.getByText('1 to go')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Previous question' }));

    expect(screen.getByText('How bad were your hot flushes today?')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: '3, Moderate' })).toBeSelected();
  });

  test('Submit stays disabled until every question is answered, then sends all answers and the note', async () => {
    await renderCard();
    expect(screen.getByRole('button', { name: 'Answer 2 more to submit' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: '2, Mild' }));
    await fireEvent.press(screen.getByRole('radio', { name: '4, Strong' }));
    await fireEvent.changeText(screen.getByLabelText('Add a note (optional)'), 'Slept badly');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit check-in' }));

    expect(mockMutate).toHaveBeenCalledWith(
      { answers: { hot_flushes: 2, night_sweats: 4 }, note: 'Slept badly' },
      expect.any(Object),
    );
  });

  test('opens the success screen after a successful submit', async () => {
    mockMutate.mockImplementation((_vars, options: { onSuccess: () => void }) => options.onSuccess());
    await renderCard({ hot_flushes: 1, night_sweats: 2 });

    await fireEvent.press(screen.getByRole('button', { name: 'Update check-in' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/checkin-done',
      params: { day: '2026-10-20', minutes: '1' },
    });
  });

  test('Next is disabled on an unanswered question', async () => {
    await renderCard();
    expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous question' })).toBeDisabled();
  });
});
