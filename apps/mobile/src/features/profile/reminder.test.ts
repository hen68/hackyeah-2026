import * as Notifications from 'expo-notifications';

import { isReminderOn, setReminder } from '@/features/profile/reminder';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

const mocked = jest.mocked(Notifications);

describe('reminder', () => {
  beforeEach(() => jest.clearAllMocks());

  test('is on only when the daily reminder is scheduled', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([{ identifier: 'other' }] as never);
    expect(await isReminderOn()).toBe(false);

    mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([{ identifier: 'daily-checkin' }] as never);
    expect(await isReminderOn()).toBe(true);
  });

  test('turning on schedules a daily 19:00 reminder after permission', async () => {
    mocked.requestPermissionsAsync.mockResolvedValueOnce({ granted: true } as never);

    expect(await setReminder(true)).toBe('on');
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'daily-checkin', trigger: { type: 'daily', hour: 19, minute: 0 } }),
    );
  });

  test('turning on without permission schedules nothing', async () => {
    mocked.requestPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);

    expect(await setReminder(true)).toBe('denied');
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('turning off cancels the reminder', async () => {
    expect(await setReminder(false)).toBe('off');
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith('daily-checkin');
  });
});
