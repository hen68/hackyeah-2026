import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';

/** Pure helpers for voice input: transcript merging, volume normalisation, language and error copy. */

export type VoiceErrorCode = ExpoSpeechRecognitionErrorCode;
export type VoiceStatus = 'idle' | 'requesting' | 'listening' | 'stopping' | 'error';

/** The native `volumechange` value runs roughly from -2 (silence) to 10 (loud). */
const VOLUME_MIN = -2;
const VOLUME_MAX = 10;

export const VOICE_LANG_PL = 'pl-PL';
export const VOICE_LANG_EN = 'en-US';

export const VOICE_COPY = {
  idle: 'Tap to talk',
  requesting: 'Getting the mic ready…',
  listening: 'Listening… tap to stop',
  stopping: 'Finishing up…',
  denied: 'Microphone is off for Digna. You can still type, or allow it in Settings.',
  noSpeech: 'I didn’t catch that. Tap the mic and try again.',
  network: 'Voice needs an internet connection. You can type instead.',
  unavailable: 'Voice isn’t available on this phone right now. Please type instead.',
  generic: 'Voice stopped unexpectedly. Please try again or type.',
} as const;

/** Joins two pieces of text with a single space, ignoring empty parts. */
export function joinTranscript(base: string, addition: string): string {
  const head = base.replace(/\s+$/, '');
  const tail = addition.trim();
  if (!tail) return base;
  if (!head) return tail;
  return `${head} ${tail}`;
}

/** Rebuilds the draft from what was typed before dictation, finalised phrases and the live phrase. */
export function mergeDraft(base: string, committed: string, interim: string): string {
  return joinTranscript(joinTranscript(base, committed), interim);
}

/** Maps a native volume reading to 0..1, clamping out-of-range values. */
export function normalizeVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const ratio = (value - VOLUME_MIN) / (VOLUME_MAX - VOLUME_MIN);
  return Math.min(1, Math.max(0, ratio));
}

/** Polish speakers get Polish recognition; everyone else gets US English. */
export function pickSpeechLang(locale: string | undefined): string {
  return locale?.toLowerCase().startsWith('pl') ? VOICE_LANG_PL : VOICE_LANG_EN;
}

/** Short, patient-safe copy for a recognition error, or null when nothing needs saying. */
export function voiceErrorMessage(code: VoiceErrorCode): string | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'no-speech':
    case 'speech-timeout':
      return VOICE_COPY.noSpeech;
    case 'network':
      return VOICE_COPY.network;
    case 'not-allowed':
      return VOICE_COPY.denied;
    case 'service-not-allowed':
    case 'language-not-supported':
      return VOICE_COPY.unavailable;
    default:
      return VOICE_COPY.generic;
  }
}

/** Text shown next to the mic: an error message wins, otherwise the current step. */
export function voiceLabel(status: VoiceStatus, message: string | null): string {
  if (status === 'error') return message ?? VOICE_COPY.generic;
  return VOICE_COPY[status];
}
