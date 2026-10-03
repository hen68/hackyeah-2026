import { fireEvent, render, screen } from '@testing-library/react-native';

import { SeverityPicker } from '@/components/ui/severity-picker';

describe('SeverityPicker', () => {
  test('renders the five severity labels in order', async () => {
    await render(<SeverityPicker value={null} onChange={jest.fn()} accessibilityLabel="Hot flushes" />);

    const radios = screen.getAllByRole('radio');

    expect(radios.map((radio) => radio.props.accessibilityLabel)).toEqual([
      '1, None',
      '2, Mild',
      '3, Moderate',
      '4, Strong',
      '5, Severe',
    ]);
  });

  test('marks only the current value as selected', async () => {
    await render(<SeverityPicker value={3} onChange={jest.fn()} accessibilityLabel="Hot flushes" />);

    expect(screen.getByRole('radio', { name: '3, Moderate' })).toBeSelected();
    expect(screen.getAllByRole('radio', { selected: true })).toHaveLength(1);
  });

  test('calls onChange with the pressed severity', async () => {
    const onChange = jest.fn();
    await render(<SeverityPicker value={null} onChange={onChange} accessibilityLabel="Hot flushes" />);

    await fireEvent.press(screen.getByRole('radio', { name: '4, Strong' }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  test('exposes the symptom name on the radio group', async () => {
    await render(<SeverityPicker value={null} onChange={jest.fn()} accessibilityLabel="Night sweats" />);

    // The group stays non-`accessible` so VoiceOver can still focus each radio row.
    expect(screen.getByLabelText('Night sweats')).toHaveProp('accessibilityRole', 'radiogroup');
  });
});
