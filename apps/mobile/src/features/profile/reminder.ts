import * as Notifications from 'expo-notifications';

const REMINDER_ID = 'daily-checkin';
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 0;

export const REMINDER_TIME_LABEL = `Every day at ${REMINDER_HOUR}:${String(REMINDER_MINUTE).padStart(2, '0')}`;

export type ReminderResult = 'on' | 'off' | 'denied';

/** The scheduled notification is the source of truth, so nothing else needs storing. */
export async function isReminderOn(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((request) => request.identifier === REMINDER_ID);
}

/** The reminder is device-wide, so it must not outlive the signed-in account. */
export function cancelReminder(): Promise<void> {
  return Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}

/** Schedules or cancels the local daily check-in reminder; asks for permission when turning it on. */
export async function setReminder(isOn: boolean): Promise<ReminderResult> {
  if (!isOn) {
    await cancelReminder();
    return 'off';
  }
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return 'denied';
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: 'Time for your check-in', body: 'How are you feeling today? It takes one minute.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
    },
  });
  return 'on';
}
