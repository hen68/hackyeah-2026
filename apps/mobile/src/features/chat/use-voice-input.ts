import { useFocusEffect } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

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
/** If the recognizer never confirms a start or stop, give up and go back to idle. */
export const START_TIMEOUT_MS = 5000;
export const STOP_TIMEOUT_MS = 3000;

type Session = { isActive: boolean; base: string; committed: string; hasSpeech: boolean };
const IDLE_SESSION: Session = { isActive: false, base: '', committed: '', hasSpeech: false };

export type VoiceInput = {
  draft: string;
  /** Use for typed edits and clearing; typing while listening stops dictation. */
  setDraft: (text: string) => void;
  /**
   * 'voice' once the draft holds dictated text; back to 'text' only when the draft is cleared.
   * Heavy typing after dictation still counts as voice — acceptable for the MVP.
   */
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

const isQuietEnding = (error: string) => error === 'no-speech' || error === 'speech-timeout';

/** Speech-to-text into the chat draft: idle → requesting → listening → stopping → idle (or error). */
export function useVoiceInput(): VoiceInput {
  const [draft, setDraftState] = useState('');
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [hasDictated, setHasDictated] = useState(false);
  const isReducedMotion = useReducedMotion();
  const level = useSharedValue(0);
  const draftRef = useRef('');
  const sessionRef = useRef<Session>(IDLE_SESSION);
  // Bumped on every cancel so a pending permission prompt can't start a stale session.
  const attemptRef = useRef(0);
  // abort() later emits error:aborted + end; count them so they can't end the next session.
  const staleEndsRef = useRef(0);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const label = voiceLabel(status, message);
  const lastAnnouncedRef = useRef(label);

  const writeDraft = useCallback((text: string) => {
    draftRef.current = text;
    setDraftState(text);
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = null;
  }, []);

  const finishSession = useCallback(() => {
    clearWatchdog();
    sessionRef.current = IDLE_SESSION;
    level.set(withTiming(0, { duration: VOLUME_SMOOTH_MS }));
  }, [clearWatchdog, level]);

  /** Stops any session or pending start. `keepError` leaves an error message on screen. */
  const cancel = useCallback(
    (keepError: boolean) => {
      attemptRef.current += 1;
      clearWatchdog();
      if (sessionRef.current.isActive) {
        finishSession();
        staleEndsRef.current += 1;
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {
          // Nothing to abort; the session is already gone.
        }
      }
      if (keepError) {
        setStatus((current) => (current === 'error' ? current : 'idle'));
        return;
      }
      setMessage(null);
      setStatus('idle');
    },
    [clearWatchdog, finishSession],
  );

  const armWatchdog = (ms: number) => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => cancel(false), ms);
  };

  useFocusEffect(useCallback(() => () => cancel(false), [cancel]));

  useEffect(() => {
    // Android reads the label through accessibilityLiveRegion; iOS needs an explicit announcement.
    if (Platform.OS !== 'ios' || label === lastAnnouncedRef.current) return;
    lastAnnouncedRef.current = label;
    AccessibilityInfo.announceForAccessibility(label);
  }, [label]);

  useSpeechRecognitionEvent('start', () => {
    if (!sessionRef.current.isActive) return;
    clearWatchdog();
    setStatus('listening');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const session = sessionRef.current;
    if (!session.isActive) return;
    const transcript = event.results[0]?.transcript ?? '';
    const hasSpeech = session.hasSpeech || transcript.trim() !== '';
    const committed = event.isFinal ? joinTranscript(session.committed, transcript) : session.committed;
    sessionRef.current = { ...session, committed, hasSpeech };
    writeDraft(mergeDraft(session.base, committed, event.isFinal ? '' : transcript));
    if (hasSpeech) setHasDictated(true);
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    if (!sessionRef.current.isActive || isReducedMotion) return;
    level.set(withTiming(normalizeVolume(event.value), { duration: VOLUME_SMOOTH_MS }));
  });

  useSpeechRecognitionEvent('error', (event) => {
    const session = sessionRef.current;
    if (!session.isActive) return;
    if (event.error === 'aborted' && staleEndsRef.current > 0) return;
    finishSession();
    // A pause after she has spoken is a normal ending, not a failure.
    const text = isQuietEnding(event.error) && session.hasSpeech ? null : voiceErrorMessage(event.error);
    setMessage(text);
    setStatus(text ? 'error' : 'idle');
  });

  useSpeechRecognitionEvent('end', () => {
    if (staleEndsRef.current > 0) {
      staleEndsRef.current -= 1;
      return;
    }
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
      sessionRef.current = { ...IDLE_SESSION, isActive: true, base: draftRef.current };
      ExpoSpeechRecognitionModule.start({
        lang: pickSpeechLang(deviceLocale()),
        interimResults: true,
        continuous: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: VOLUME_INTERVAL_MS },
      });
      armWatchdog(START_TIMEOUT_MS);
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
    armWatchdog(STOP_TIMEOUT_MS);
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      cancel(false);
    }
  };

  const setDraft = (text: string) => {
    if (sessionRef.current.isActive) cancel(true);
    writeDraft(text);
    if (!text.trim()) setHasDictated(false);
  };

  return {
    draft,
    setDraft,
    inputMode: hasDictated && draft.trim() ? 'voice' : 'text',
    status,
    label,
    level,
    toggle,
  };
}
