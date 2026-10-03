import { act, renderHook } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { useVoiceInput } from '@/features/chat/use-voice-input';
import { VOICE_COPY } from '@/features/chat/voice-transcript';

type Listener = (event: unknown) => void;
const mockListeners: Record<string, Listener> = {};

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn(),
    isRecognitionAvailable: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  },
  useSpeechRecognitionEvent: (name: string, listener: Listener) => {
    mockListeners[name] = listener;
  },
}));

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => () => void) => useEffect(effect, [effect]) };
});

jest.mock('react-native-reanimated', () => {
  const { useState } = jest.requireActual('react');
  return {
    useSharedValue: (initial: number) =>
      useState(() => {
        let current = initial;
        return { get: () => current, set: (next: number) => (current = next) };
      })[0],
    withTiming: (value: number) => value,
  };
});

const speech = jest.mocked(ExpoSpeechRecognitionModule);
const emit = (name: string, event: unknown = null) => act(() => mockListeners[name]?.(event));
const result = (transcript: string, isFinal: boolean) => ({ isFinal, results: [{ transcript }] });

async function startListening(hook: { current: ReturnType<typeof useVoiceInput> }) {
  await act(async () => hook.current.toggle());
  await emit('start');
}

beforeEach(() => {
  jest.clearAllMocks();
  speech.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
  speech.isRecognitionAvailable.mockReturnValue(true);
});

describe('useVoiceInput', () => {
  test('appends live and final dictation to what she typed and marks the draft as voice', async () => {
    const { result: hook } = await renderHook(() => useVoiceInput());
    await act(() => hook.current.setDraft('Morning.'));

    await startListening(hook);
    expect(hook.current.status).toBe('listening');
    expect(hook.current.label).toBe('Listening… tap to stop');
    expect(speech.start).toHaveBeenCalledWith(
      expect.objectContaining({ interimResults: true, volumeChangeEventOptions: expect.anything() }),
    );

    await emit('result', result('I feel', false));
    expect(hook.current.draft).toBe('Morning. I feel');
    await emit('result', result('I feel tired', true));
    await emit('result', result('and achy', false));
    expect(hook.current.draft).toBe('Morning. I feel tired and achy');
    expect(hook.current.inputMode).toBe('voice');
  });

  test('tapping again stops, and the end event returns to idle keeping the text', async () => {
    const { result: hook } = await renderHook(() => useVoiceInput());
    await startListening(hook);
    await emit('result', result('hot flushes', false));

    await act(() => hook.current.toggle());
    expect(speech.stop).toHaveBeenCalledTimes(1);
    expect(hook.current.status).toBe('stopping');

    await emit('result', result('hot flushes', true));
    await emit('end');
    expect(hook.current.status).toBe('idle');
    expect(hook.current.draft).toBe('hot flushes');
  });

  test('clearing the draft after sending resets the mode to text', async () => {
    const { result: hook } = await renderHook(() => useVoiceInput());
    await startListening(hook);
    await emit('result', result('tired', true));
    await emit('end');

    await act(() => hook.current.setDraft(''));
    expect(hook.current.inputMode).toBe('text');
  });

  test('shows a gentle message and does not start when permission is denied', async () => {
    speech.requestPermissionsAsync.mockResolvedValue({ granted: false } as never);
    const { result: hook } = await renderHook(() => useVoiceInput());

    await act(async () => hook.current.toggle());
    expect(speech.start).not.toHaveBeenCalled();
    expect(hook.current.status).toBe('error');
    expect(hook.current.label).toBe(VOICE_COPY.denied);
  });

  test('explains when recognition is unavailable', async () => {
    speech.isRecognitionAvailable.mockReturnValue(false);
    const { result: hook } = await renderHook(() => useVoiceInput());

    await act(async () => hook.current.toggle());
    expect(speech.start).not.toHaveBeenCalled();
    expect(hook.current.label).toBe(VOICE_COPY.unavailable);
  });

  test('turns recognition errors into friendly copy', async () => {
    const { result: hook } = await renderHook(() => useVoiceInput());
    await startListening(hook);

    await emit('error', { error: 'no-speech', message: 'No speech' });
    expect(hook.current.status).toBe('error');
    expect(hook.current.label).toBe(VOICE_COPY.noSpeech);
  });

  test('typing while listening aborts dictation and keeps her edit', async () => {
    const { result: hook } = await renderHook(() => useVoiceInput());
    await startListening(hook);
    await emit('result', result('tired', false));

    await act(() => hook.current.setDraft('tired and sad'));
    expect(speech.abort).toHaveBeenCalledTimes(1);
    expect(hook.current.status).toBe('idle');

    await emit('result', result('late words', false));
    expect(hook.current.draft).toBe('tired and sad');
  });

  test('aborts recognition when the screen goes away', async () => {
    const { result: hook, unmount } = await renderHook(() => useVoiceInput());
    await startListening(hook);

    await act(() => unmount());
    expect(speech.abort).toHaveBeenCalledTimes(1);
  });
});
