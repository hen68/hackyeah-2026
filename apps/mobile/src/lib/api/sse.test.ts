import { createSseParser } from '@/lib/api/sse';

const STREAM =
  'event: delta\ndata: {"text":"Hi "}\n\nevent: delta\ndata: {"text":"there"}\n\nevent: done\ndata: {}\n\n';

describe('createSseParser', () => {
  test('parses complete frames with their event names', () => {
    expect(createSseParser().push(STREAM)).toEqual([
      { event: 'delta', data: '{"text":"Hi "}' },
      { event: 'delta', data: '{"text":"there"}' },
      { event: 'done', data: '{}' },
    ]);
  });

  test('gives the same events whatever the chunk boundaries', () => {
    for (let size = 1; size <= STREAM.length; size += 1) {
      const parser = createSseParser();
      const events = [];
      for (let i = 0; i < STREAM.length; i += size) events.push(...parser.push(STREAM.slice(i, i + size)));
      expect(events).toEqual(createSseParser().push(STREAM));
    }
  });

  test('holds a partial frame until it is finished', () => {
    const parser = createSseParser();
    expect(parser.push('event: delta\ndata: {"te')).toEqual([]);
    expect(parser.push('xt":"a"}\n\n')).toEqual([{ event: 'delta', data: '{"text":"a"}' }]);
  });

  test('handles CRLF line endings split across chunks', () => {
    const parser = createSseParser();
    expect(parser.push('event: done\r\ndata: {}\r')).toEqual([]);
    expect(parser.push('\n\r\n')).toEqual([{ event: 'done', data: '{}' }]);
  });

  test('skips comments, defaults the event name and joins multi-line data', () => {
    expect(createSseParser().push(': keep-alive\n\ndata: a\ndata: b\n\n')).toEqual([
      { event: 'message', data: 'a\nb' },
    ]);
  });
});
