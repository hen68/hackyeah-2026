import { saveEntry, saveNote } from '@/lib/api/checkins';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('checkin input validation', () => {
  test('rejects future dates before touching the database', async () => {
    await expect(saveEntry({ patientId: 'p1', day: '2999-01-01', symptomCode: 'sleep', severity: 3 })).rejects.toThrow(
      'Future dates cannot be logged',
    );
  });

  test('rejects malformed dates and out-of-range severities', async () => {
    await expect(
      saveEntry({ patientId: 'p1', day: '2026-02-30', symptomCode: 'sleep', severity: 3 }),
    ).rejects.toThrow();
    await expect(
      saveEntry({ patientId: 'p1', day: '2026-01-01', symptomCode: 'sleep', severity: 6 }),
    ).rejects.toThrow();
  });

  test('rejects notes over the database limit', async () => {
    await expect(saveNote({ patientId: 'p1', day: '2026-01-01', note: 'x'.repeat(2001) })).rejects.toThrow();
  });
});
