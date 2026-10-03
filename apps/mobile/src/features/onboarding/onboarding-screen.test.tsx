import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { HRT_OPTIONS, type HrtStatus } from '@/features/onboarding/answers';
import { ChoiceQuestion } from '@/features/onboarding/onboarding-screen';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

function Harness({ onContinue }: { onContinue: () => void }) {
  const [value, setValue] = useState<HrtStatus | null>(null);
  return (
    <ChoiceQuestion
      step={3}
      title="Are you taking hormone therapy?"
      hint="Hint"
      options={HRT_OPTIONS}
      value={value}
      onChange={setValue}
      onContinue={onContinue}
    />
  );
}

describe('ChoiceQuestion', () => {
  test('Continue is disabled until an answer is chosen', async () => {
    const onContinue = jest.fn();
    await render(<Harness onContinue={onContinue} />);

    expect(screen.getByRole('button', { name: 'Choose an answer' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'No' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('button', { name: 'No' })).toBeSelected();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  test('shows the step and a back button after the first step', async () => {
    await render(<Harness onContinue={jest.fn()} />);

    expect(screen.getByRole('progressbar', { name: 'Step 3 of 5' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
  });
});
