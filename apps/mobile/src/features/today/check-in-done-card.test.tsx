import { fireEvent, render, screen } from '@testing-library/react-native';

import { CheckInDoneCard } from '@/features/today/check-in-done-card';

const SYMPTOMS = [
  { code: 'hot_flushes', label: 'Hot flushes' },
  { code: 'sleep', label: 'Sleep trouble' },
];

describe('CheckInDoneCard', () => {
  test('lists the saved answers and reopens at a tapped one', async () => {
    const onEdit = jest.fn();
    await render(<CheckInDoneCard symptoms={SYMPTOMS} answered={{ hot_flushes: 2, sleep: 4 }} onEdit={onEdit} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sleep trouble: Strong' }));
    expect(onEdit).toHaveBeenCalledWith('sleep');
  });

  test('Edit answers reopens from the first question', async () => {
    const onEdit = jest.fn();
    await render(<CheckInDoneCard symptoms={SYMPTOMS} answered={{ hot_flushes: 2, sleep: 4 }} onEdit={onEdit} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Edit answers' }));
    expect(onEdit).toHaveBeenCalledWith(null);
  });
});
