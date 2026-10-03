import { submitCheckin } from '@/lib/api/checkins';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const valid = { patientId: 'p1', day: '2026-01-01', answers: { sleep: 3 }, note: '' };

describe('submitCheckin input validation', () => {
  test('rejects future dates before touching the database', async () => {
    await expect(submitCheckin({ ...valid, day: '2999-01-01' })).rejects.toThrow('Future dates cannot be logged');
  });

  test('rejects malformed dates and out-of-range severities', async () => {
    await expect(submitCheckin({ ...valid, day: '2026-02-30' })).rejects.toThrow();
    await expect(submitCheckin({ ...valid, answers: { sleep: 6 } })).rejects.toThrow();
    await expect(submitCheckin({ ...valid, answers: { sleep: 0 } })).rejects.toThrow();
  });

  test('rejects notes over the database limit', async () => {
    await expect(submitCheckin({ ...valid, note: 'x'.repeat(2001) })).rejects.toThrow();
  });
});
