import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';

import { VoiceButton } from '@/features/chat/voice-button';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const value = () => ({ get: () => 0, set: () => {} });
  const identity = (input: unknown) => input;
  return {
    __esModule: true,
    default: { View },
    cancelAnimation: () => {},
    Easing: { inOut: identity, sin: identity },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    useSharedValue: value,
    withRepeat: identity,
    withTiming: identity,
  };
});

const level = { get: () => 0, set: () => {}, value: 0 } as unknown as SharedValue<number>;

describe('VoiceButton', () => {
  test('uses the status label as its name and is tappable when idle', async () => {
    const onPress = jest.fn();
    await render(<VoiceButton status="idle" level={level} label="Tap to talk" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Tap to talk' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('is selected while listening', async () => {
    await render(<VoiceButton status="listening" level={level} label="Listening… tap to stop" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Listening… tap to stop' })).toBeSelected();
  });

  test('is busy and disabled while getting ready', async () => {
    await render(<VoiceButton status="requesting" level={level} label="Getting the mic ready…" onPress={jest.fn()} />);

    const button = screen.getByRole('button', { name: 'Getting the mic ready…' });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
  });
});
