import {
  joinTranscript,
  mergeDraft,
  normalizeVolume,
  pickSpeechLang,
  VOICE_COPY,
  voiceErrorMessage,
  voiceLabel,
} from '@/features/chat/voice-transcript';

describe('joinTranscript', () => {
  test('joins with a single space and trims the addition', () => {
    expect(joinTranscript('I slept badly', '  hot flushes ')).toBe('I slept badly hot flushes');
  });

  test('drops trailing whitespace from the base before joining', () => {
    expect(joinTranscript('Hello  ', 'there')).toBe('Hello there');
  });

  test('returns the base untouched when the addition is empty', () => {
    expect(joinTranscript('Typed ', '   ')).toBe('Typed ');
  });

  test('returns the addition when the base is empty', () => {
    expect(joinTranscript('', 'tired today')).toBe('tired today');
  });
});

describe('mergeDraft', () => {
  test('keeps the typed text, then finalised phrases, then the live phrase', () => {
    expect(mergeDraft('Morning.', 'I feel tired', 'and achy')).toBe('Morning. I feel tired and achy');
  });

  test('works with nothing typed before dictation', () => {
    expect(mergeDraft('', '', 'hot flush')).toBe('hot flush');
  });

  test('shows only the base before any speech arrives', () => {
    expect(mergeDraft('Typed', '', '')).toBe('Typed');
  });
});

describe('normalizeVolume', () => {
  test('maps the native range onto 0..1', () => {
    expect(normalizeVolume(-2)).toBe(0);
    expect(normalizeVolume(4)).toBeCloseTo(0.5);
    expect(normalizeVolume(10)).toBe(1);
  });

  test('clamps out-of-range and invalid readings', () => {
    expect(normalizeVolume(-10)).toBe(0);
    expect(normalizeVolume(25)).toBe(1);
    expect(normalizeVolume(Number.NaN)).toBe(0);
  });
});

describe('pickSpeechLang', () => {
  test('uses Polish for Polish locales', () => {
    expect(pickSpeechLang('pl-PL')).toBe('pl-PL');
    expect(pickSpeechLang('PL')).toBe('pl-PL');
  });

  test('falls back to US English otherwise', () => {
    expect(pickSpeechLang('de-DE')).toBe('en-US');
    expect(pickSpeechLang(undefined)).toBe('en-US');
  });
});

describe('voiceErrorMessage', () => {
  test('stays silent when she cancelled', () => {
    expect(voiceErrorMessage('aborted')).toBeNull();
  });

  test('maps known errors to friendly copy', () => {
    expect(voiceErrorMessage('no-speech')).toBe(VOICE_COPY.noSpeech);
    expect(voiceErrorMessage('speech-timeout')).toBe(VOICE_COPY.noSpeech);
    expect(voiceErrorMessage('network')).toBe(VOICE_COPY.network);
    expect(voiceErrorMessage('not-allowed')).toBe(VOICE_COPY.denied);
    expect(voiceErrorMessage('service-not-allowed')).toBe(VOICE_COPY.unavailable);
    expect(voiceErrorMessage('language-not-supported')).toBe(VOICE_COPY.unavailable);
  });

  test('uses a generic message for anything else', () => {
    expect(voiceErrorMessage('audio-capture')).toBe(VOICE_COPY.generic);
  });
});

describe('voiceLabel', () => {
  test('describes each step', () => {
    expect(voiceLabel('idle', null)).toBe('Tap to talk');
    expect(voiceLabel('listening', null)).toBe('Listening… tap to stop');
  });

  test('shows the error message, or a generic one', () => {
    expect(voiceLabel('error', VOICE_COPY.network)).toBe(VOICE_COPY.network);
    expect(voiceLabel('error', null)).toBe(VOICE_COPY.generic);
  });
});
