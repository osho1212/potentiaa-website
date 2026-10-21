import { getEventSettings, listAllBookings, saveBookingFields } from './storage-adapter';
import { balanceDue } from './booking-payments';
import { sendBookingReceivedEmail } from './email-service';

/** Today's date in India, as YYYY-MM-DD. */
export function istDate(now: number = Date.now()): string {
  return new Date(now + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface ReminderRun {
  today: string;
  /** False when today is not a reminder date (or reminders are off) and the run was not forced. */
  due: boolean;
  sent: number;
  failed: number;
  /** Bookings already reminded today. */
  skipped: number;
  errors: string[];
}

/**
 * Emails a balance reminder to every pre-booking with a balance due.
 *
 * Run every morning by the Vercel cron (vercel.json); it only sends on the
 * dates set in organiser settings, which default to the proposal's 1 Nov and
 * the morning of 3 Nov. An organiser can also send them now from the
 * dashboard (force). Either way a booking gets at most one reminder a day,
 * and none once the event has started.
 */
export async function sendBalanceReminders({
  mode = 'live',
  force = false,
  now = Date.now(),
}: { mode?: 'test' | 'live'; force?: boolean; now?: number } = {}): Promise<ReminderRun> {
  const { settings } = await getEventSettings();
  const today = istDate(now);
  const run: ReminderRun = { today, due: false, sent: 0, failed: 0, skipped: 0, errors: [] };

  const dates = (settings.reminderDates || '').split(',').map((day) => day.trim()).filter(Boolean);
  if (!force && (!settings.remindersEnabled || !dates.includes(today))) return run;
  if (today > settings.eventDate) return run;
  run.due = true;

  const bookings = (await listAllBookings()).filter(
    (booking) => booking.mode === mode && booking.status === 'booked' && balanceDue(booking) > 0
  );
  for (const booking of bookings) {
    const previous = booking.reminders || [];
    if (previous.some((entry) => entry.date === today && entry.success)) {
      run.skipped++;
      continue;
    }
    const result = await sendBookingReceivedEmail(booking, balanceDue(booking), { reminder: true });
    const entry = {
      date: today,
      sentAt: new Date().toISOString(),
      success: result.success,
      ...(result.success ? {} : { error: result.errors[0] || 'Not sent.' }),
    };
    try {
      await saveBookingFields(booking.id, { reminders: [...previous, entry] });
    } catch (error) {
      console.error(`[Reminders] Could not record the reminder for ${booking.id}:`, error);
    }
    if (result.success) run.sent++;
    else {
      run.failed++;
      run.errors.push(`${booking.buyer?.name || booking.id}: ${entry.error}`);
    }
  }
  return run;
}
