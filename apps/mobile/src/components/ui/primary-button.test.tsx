import { fireEvent, render, screen } from '@testing-library/react-native';

import { PrimaryButton } from '@/components/ui/primary-button';

describe('PrimaryButton', () => {
  test('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Continue" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('is disabled and ignores presses when disabled', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Choose an answer" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Choose an answer' });
    await fireEvent.press(button);

    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });
});
