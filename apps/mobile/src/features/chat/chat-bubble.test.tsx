import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChatBubble } from '@/features/chat/chat-bubble';
import type { ChatItem } from '@/features/chat/thread';

const DAY = '2026-10-03';
const labelFor = (code: string) => ({ hot_flushes: 'Hot flushes', tiredness: 'Tiredness' })[code] ?? code;

const REPLY: ChatItem = {
  id: 'm1',
  role: 'assistant',
  content: 'Thank you.',
  inputMode: 'text',
  localDate: DAY,
  status: 'sent',
  observations: [
    { key: 'a', symptomCode: 'hot_flushes', customLabel: null, severity: 5, durationDays: null, observedOn: DAY },
    { key: 'b', symptomCode: 'tiredness', customLabel: null, severity: null, durationDays: null, observedOn: DAY },
  ],
};

describe('ChatBubble', () => {
  test('renders a chip per observation and opens the day on "Change this"', async () => {
    const onChangeDay = jest.fn();
    await render(<ChatBubble item={REPLY} labelFor={labelFor} onRetry={jest.fn()} onChangeDay={onChangeDay} />);

    expect(screen.getByText('I’ve added this to today:')).toBeOnTheScreen();
    expect(screen.getByText('Hot flushes · Severe')).toBeOnTheScreen();
    expect(screen.getByText('Tiredness · Mentioned')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('link', { name: 'Change this' }));
    expect(onChangeDay).toHaveBeenCalledWith(DAY);
  });

  test('a reply without observations has no chips or link', async () => {
    await render(
      <ChatBubble
        item={{ ...REPLY, observations: [] }}
        labelFor={labelFor}
        onRetry={jest.fn()}
        onChangeDay={jest.fn()}
      />,
    );

    expect(screen.queryByText('I’ve added this to today:')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('a failed patient message shows the error and retries', async () => {
    const onRetry = jest.fn();
    const failed: ChatItem = { ...REPLY, id: 'u1', role: 'user', observations: [], status: 'failed', error: 'Oops' };
    await render(<ChatBubble item={failed} labelFor={labelFor} onRetry={onRetry} onChangeDay={jest.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Oops');
    await fireEvent.press(screen.getByRole('button', { name: 'Try sending again' }));
    expect(onRetry).toHaveBeenCalledWith(failed);
  });
});
