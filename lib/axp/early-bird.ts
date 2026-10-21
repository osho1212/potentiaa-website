import type { EventSettings } from './event-settings';
import type { BookingRecord } from './storage-adapter';
import { holdsPlaces } from './capacity';
import { earlyBirdEndsAt } from '../../public/axp/pricing.js';

export interface EarlyBirdStatus {
  /** Switched on in organiser settings. */
  enabled: boolean;
  /** Before the end time with at least one early-bird pass left. */
  open: boolean;
  endsAt: string | null;
  cap: number;
  sold: number;
  left: number;
}

/**
 * Where the early bird stands for one payment mode. A pass counts as sold
 * from the moment its checkout opens, as a place does, so the 60th pass
 * cannot be sold twice while two guests are paying; an abandoned checkout
 * gives its passes back after 15 minutes.
 */
export function earlyBirdStatus(
  settings: EventSettings,
  bookings: BookingRecord[],
  mode: 'test' | 'live',
  now: number = Date.now()
): EarlyBirdStatus {
  const ends = earlyBirdEndsAt(settings);
  const sold = bookings
    .filter((booking) => booking.mode === mode && booking.priceList === 'early' && holdsPlaces(booking, now))
    .reduce((sum, booking) => sum + (booking.guestCount || booking.attendees?.length || 0), 0);
  const left = Math.max(0, settings.earlyBirdCap - sold);
  return {
    enabled: !!settings.earlyBirdEnabled,
    open: !!settings.earlyBirdEnabled && ends !== null && now <= ends && left > 0,
    endsAt: ends === null ? null : new Date(ends).toISOString(),
    cap: settings.earlyBirdCap,
    sold,
    left,
  };
}

/** Early-bird prices go to a whole booking or not at all: every pass must fit under the cap. */
export function earlyBirdFits(status: EarlyBirdStatus, people: number): boolean {
  return status.open && people <= status.left;
}
