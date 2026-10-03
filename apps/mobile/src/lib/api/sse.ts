export type SseEvent = { event: string; data: string };

export type SseParser = {
  /** Feeds decoded text; returns the events completed by it. Partial events wait for the next chunk. */
  push: (chunk: string) => SseEvent[];
};

const DEFAULT_EVENT = 'message';

function parseFrame(frame: string): SseEvent | null {
  let event = DEFAULT_EVENT;
  const data: string[] = [];
  for (const line of frame.split('\n')) {
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  return data.length > 0 ? { event, data: data.join('\n') } : null;
}

/** Minimal server-sent events parser (event + data fields), robust to frames split across chunks. */
export function createSseParser(): SseParser {
  let buffer = '';
  return {
    push(chunk) {
      // A trailing \r may be the first half of a \r\n split across chunks: keep it until the next one.
      buffer = (buffer + chunk).replace(/\r\n|\r(?!$)/g, '\n');
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      return frames.flatMap((frame) => parseFrame(frame) ?? []);
    },
  };
}
