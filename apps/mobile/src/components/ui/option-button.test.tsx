import { fireEvent, render, screen } from '@testing-library/react-native';

import { OptionButton } from '@/components/ui/option-button';

describe('OptionButton', () => {
  test('reflects the selected state for assistive tech', async () => {
    await render(<OptionButton label="45 to 49" isSelected onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: '45 to 49' })).toBeSelected();
  });

  test('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<OptionButton label="50 to 54" isSelected={false} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: '50 to 54' }));

    expect(screen.getByRole('button', { name: '50 to 54' })).not.toBeSelected();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
