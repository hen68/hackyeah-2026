import { formatExpiry, summarizeProfile } from '@/features/profile/profile-summary';

describe('summarizeProfile', () => {
  const profile = { display_name: null, age_band: '45_49', menopause_stage: 'perimenopause', hrt_status: 'no' };

  test('falls back to the email name and lists stage, HRT and age', () => {
    expect(summarizeProfile(profile, 'anna.k@example.com')).toEqual({
      name: 'anna.k',
      initial: 'A',
      details: 'Likely perimenopause · No HRT · Age 45 to 49',
    });
  });

  test('prefers the display name and skips missing answers', () => {
    const summary = summarizeProfile(
      { display_name: ' Basia ', age_band: null, menopause_stage: null, hrt_status: null },
      'x@y.z',
    );
    expect(summary).toEqual({ name: 'Basia', initial: 'B', details: '' });
  });
});

describe('formatExpiry', () => {
  const now = new Date('2026-10-03T10:00:00Z');

  test('shows whole hours when an hour or more is left', () => {
    expect(formatExpiry('2026-10-04T09:59:00Z', now)).toBe('It expires in 23 h.');
  });

  test('shows minutes in the last hour', () => {
    expect(formatExpiry('2026-10-03T10:45:30Z', now)).toBe('It expires in 45 min.');
  });

  test('returns null once expired', () => {
    expect(formatExpiry('2026-10-03T10:00:00Z', now)).toBeNull();
  });
});
