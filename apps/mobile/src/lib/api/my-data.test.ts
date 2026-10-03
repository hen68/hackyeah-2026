import { getMyData } from '@/lib/api/my-data';

const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => mockFrom(table) } }));

type Response = { data: unknown; error: unknown };

/** A PostgREST builder stand-in: every filter returns itself and awaiting it yields `response`. */
function builder(response: Response) {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    maybeSingle: () => query,
    then: (resolve: (value: Response) => unknown) => resolve(response),
  };
  return query;
}

const NOW = new Date('2026-10-03T20:00:00Z');

describe('getMyData', () => {
  beforeEach(() => mockFrom.mockReset());

  test('collects every table under its own key', async () => {
    mockFrom.mockImplementation((table: string) => builder({ data: [{ table }], error: null }));

    const data = await getMyData('patient-1', NOW);

    expect(data.exported_at).toBe('2026-10-03T20:00:00.000Z');
    expect(data.checkins).toEqual([{ table: 'checkins' }]);
    expect(data.chat_messages).toEqual([{ table: 'chat_messages' }]);
    expect(data.wearable_connections).toEqual([{ table: 'wearable_connections' }]);
    expect(mockFrom).toHaveBeenCalledTimes(8);
  });

  test('throws the first failed query error', async () => {
    const failure = { code: '42501', message: 'denied', details: null };
    mockFrom.mockImplementation((table: string) =>
      builder(table === 'observations' ? { data: null, error: failure } : { data: [], error: null }),
    );

    await expect(getMyData('patient-1', NOW)).rejects.toBe(failure);
  });
});
