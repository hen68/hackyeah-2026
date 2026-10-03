import { useFocusEffect } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import {
  joinTranscript,
  mergeDraft,
  normalizeVolume,
  pickSpeechLang,
  VOICE_COPY,
  voiceErrorMessage,
  voiceLabel,
  type VoiceStatus,
} from '@/features/chat/voice-transcript';

export type InputMode = 'text' | 'voice';

const VOLUME_INTERVAL_MS = 100;
const VOLUME_SMOOTH_MS = 140;

type Session = { isActive: boolean; base: string; committed: string };
const IDLE_SESSION: Session = { isActive: false, base: '', committed: '' };

export type VoiceInput = {
  draft: string;
  /** Use for typed edits and clearing; typing while listening stops dictation. */
  setDraft: (text: string) => void;
  /** 'voice' while the draft holds dictated text; back to 'text' once the draft is cleared. */
  inputMode: InputMode;
  status: VoiceStatus;
  label: string;
  /** Smoothed microphone level, 0..1, for the mic animation. */
  level: SharedValue<number>;
  toggle: () => void;
};

const deviceLocale = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
};

/** Speech-to-text into the chat draft: idle → requesting → listening → stopping → idle (or error). */
export function useVoiceInput(): VoiceInput {
  const [draft, setDraftState] = useState('');
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [hasDictated, setHasDictated] = useState(false);
  const level = useSharedValue(0);
  const draftRef = useRef('');
  const sessionRef = useRef<Session>(IDLE_SESSION);
  // Bumped on every cancel so a pending permission prompt can't start a stale session.
  const attemptRef = useRef(0);

  const writeDraft = useCallback((text: string) => {
    draftRef.current = text;
    setDraftState(text);
  }, []);

  const finishSession = useCallback(() => {
    sessionRef.current = IDLE_SESSION;
    level.set(withTiming(0, { duration: VOLUME_SMOOTH_MS }));
  }, [level]);

  const cancel = useCallback(() => {
    attemptRef.current += 1;
    if (sessionRef.current.isActive) {
      finishSession();
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // Nothing to abort; the session is already gone.
      }
    }
    setStatus((current) => (current === 'error' ? current : 'idle'));
  }, [finishSession]);

  useFocusEffect(useCallback(() => cancel, [cancel]));

  useSpeechRecognitionEvent('start', () => {
    if (sessionRef.current.isActive) setStatus('listening');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const session = sessionRef.current;
    if (!session.isActive) return;
    const transcript = event.results[0]?.transcript ?? '';
    const committed = event.isFinal ? joinTranscript(session.committed, transcript) : session.committed;
    sessionRef.current = { ...session, committed };
    writeDraft(mergeDraft(session.base, committed, event.isFinal ? '' : transcript));
    if (transcript.trim()) setHasDictated(true);
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    if (!sessionRef.current.isActive) return;
    level.set(withTiming(normalizeVolume(event.value), { duration: VOLUME_SMOOTH_MS }));
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!sessionRef.current.isActive) return;
    finishSession();
    const text = voiceErrorMessage(event.error);
    setMessage(text);
    setStatus(text ? 'error' : 'idle');
  });

  useSpeechRecognitionEvent('end', () => {
    if (!sessionRef.current.isActive) return;
    finishSession();
    setStatus('idle');
  });

  const fail = (text: string) => {
    setMessage(text);
    setStatus('error');
  };

  const start = async () => {
    const attempt = (attemptRef.current += 1);
    setMessage(null);
    setStatus('requesting');
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (attempt !== attemptRef.current) return;
      if (!permission.granted) return fail(VOICE_COPY.denied);
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return fail(VOICE_COPY.unavailable);
      sessionRef.current = { isActive: true, base: draftRef.current, committed: '' };
      ExpoSpeechRecognitionModule.start({
        lang: pickSpeechLang(deviceLocale()),
        interimResults: true,
        continuous: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: VOLUME_INTERVAL_MS },
      });
    } catch {
      if (attempt !== attemptRef.current) return;
      finishSession();
      fail(VOICE_COPY.unavailable);
    }
  };

  const toggle = () => {
    if (status === 'requesting' || status === 'stopping') return;
    if (status !== 'listening') {
      void start();
      return;
    }
    setStatus('stopping');
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      cancel();
    }
  };

  const setDraft = (text: string) => {
    if (sessionRef.current.isActive) cancel();
    writeDraft(text);
    if (!text.trim()) setHasDictated(false);
  };

  return {
    draft,
    setDraft,
    inputMode: hasDictated && draft.trim() ? 'voice' : 'text',
    status,
    label: voiceLabel(status, message),
    level,
    toggle,
  };
}
