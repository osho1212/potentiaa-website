/**
 * Aagaz prices, in one place. The booking page, the organiser dashboard and
 * the server all import this file, so the amount a guest is shown is the
 * amount the server charges; the server still works it out again itself.
 *
 * Two choices decide a booking's price:
 *  1. The price list, once per booking. Early-bird prices apply only to a
 *     booking paid in full while the early bird is open (before its end time,
 *     with enough early-bird passes left for the whole booking). Pre-bookings
 *     always pay regular prices.
 *  2. The fare, once per person. A booking of four or more is a group: every
 *     guest pays the group price of their own pass, Silver or Gold, whatever
 *     the mix. In a booking of two or three, two people of different genders
 *     make a couple, on any passes, and each pays that same lower price for
 *     their own pass; everyone else pays single. An organiser entering a
 *     booking from the dashboard can set a fare by hand instead, which is how
 *     a same-gender couple or a group of fewer than four gets the lower price.
 *
 * Amounts are worked in paise so rupee prices never pick up rounding errors.
 */

export const GENDERS = Object.freeze(['woman', 'man', 'nonbinary']);
export const GENDER_LABELS = Object.freeze({ woman: 'Woman', man: 'Man', nonbinary: 'Non-binary' });
export const PASS_LABELS = Object.freeze({ normal: 'Silver', alcohol: 'Gold' });
export const FARE_LABELS = Object.freeze({ single: 'Single', couple: 'Couple', group: 'Group' });
export const FARES = Object.freeze(['single', 'couple', 'group']);
export const GROUP_SIZE = 4;

// Settings keys for each price. A couple and a group share one price.
const PRICE_KEYS = Object.freeze({
  regular: {
    normal: { single: 'normalPrice', shared: 'normalGroupPrice' },
    alcohol: { single: 'alcoholPrice', shared: 'alcoholGroupPrice' },
  },
  early: {
    normal: { single: 'earlyNormalPrice', shared: 'earlyNormalGroupPrice' },
    alcohol: { single: 'earlyAlcoholPrice', shared: 'earlyAlcoholGroupPrice' },
  },
});

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

/** The price in rupees of one pass on a price list and fare. */
export function unitPrice(settings, priceList, pass, fare) {
  const keys = PRICE_KEYS[priceList === 'early' ? 'early' : 'regular'][pass === 'alcohol' ? 'alcohol' : 'normal'];
  const single = settings[keys.single];
  if (fare === 'single') return single;
  // Settings saved before couple and group prices existed fall back to single.
  return settings[keys.shared] ?? single;
}

/** @typedef {'single' | 'couple' | 'group'} Fare */
/**
 * @typedef {object} Quote
 * @property {'full' | 'prebook'} plan
 * @property {'early' | 'regular'} priceList
 * @property {number} people
 * @property {{ pass: string, fare: Fare, unitPaise: number, savingPaise: number }[]} lines
 * @property {number} subtotalPaise
 * @property {number | null} extrasPaise
 * @property {number | null} totalPaise
 * @property {number | null} payNowPaise
 * @property {number | null} balancePaise
 * @property {number} savingPaise
 */

/**
 * The fare for each attendee, in the same order. Attendees need `pass`
 * ('normal' | 'alcohol') and `gender`; a missing gender never makes a couple.
 * `couplePriority` ranks a pass by what its couple price saves; with three
 * guests the pair that saves the most is the couple, and on a tie the first.
 * Without it, Gold ranks above Silver.
 * @param {{ pass?: string, gender?: string }[]} attendees
 * @param {(pass: string) => number} [couplePriority]
 * @returns {Fare[]}
 */
export function assignFares(attendees, couplePriority = (pass) => (pass === 'alcohol' ? 2 : 1)) {
  // Four or more in one booking: everyone is in the group, on either pass.
  if (attendees.length >= GROUP_SIZE) return attendees.map(() => 'group');
  /** @type {Fare[]} */
  const fares = attendees.map(() => 'single');
  // Two or three: at most one couple, two people of different genders on
  // any passes.
  let best = null;
  for (let x = 0; x < attendees.length; x++) {
    for (let y = x + 1; y < attendees.length; y++) {
      const a = attendees[x].gender;
      const b = attendees[y].gender;
      if (!a || !b || a === b) continue;
      const value = couplePriority(attendees[x].pass) + couplePriority(attendees[y].pass);
      if (!best || value > best.value) best = { x, y, value };
    }
  }
  if (best) {
    fares[best.x] = 'couple';
    fares[best.y] = 'couple';
  }
  return fares;
}

/**
 * When the early bird ends, as a timestamp, or null when it is switched off.
 * @param {Record<string, any>} settings
 * @returns {number | null}
 */
export function earlyBirdEndsAt(settings) {
  if (!settings.earlyBirdEnabled) return null;
  const at = Date.parse(`${settings.earlyBirdEndDate}T${settings.earlyBirdEndTime}:59+05:30`);
  return Number.isNaN(at) ? null : at;
}

/**
 * The price of a booking and what is due now.
 *
 * plan: 'full' pays everything now; 'prebook' pays a deposit per person now
 * and the balance later. earlyBird: whether early-bird prices are available
 * to this booking (the server decides, from the clock and the cap).
 *
 * fareOverrides: a fare per attendee, in the same order, set by an organiser
 * entering a booking by hand. Anything else in the list - '', null, a word
 * that is not a fare - leaves that attendee on the fare the rules give them.
 * A guest booking online never sends these: only the organiser dashboard does,
 * and only the manual-booking endpoint passes them on.
 *
 * totalPaise is null while the organiser has not confirmed final charges.
 * @param {{ pass?: string, gender?: string }[]} attendees
 * @param {Record<string, any>} settings
 * @param {{ plan?: string, earlyBird?: boolean, fareOverrides?: (string | null)[] | null }} [options]
 * @returns {Quote}
 */
export function quoteBooking(attendees, settings, { plan = 'full', earlyBird = false, fareOverrides = null } = {}) {
  const prebook = plan === 'prebook';
  const priceList = !prebook && earlyBird ? 'early' : 'regular';
  // The couple is the pair whose couple prices save the most on this list.
  const fares = assignFares(attendees, (pass) =>
    toPaise(unitPrice(settings, priceList, pass, 'single')) - toPaise(unitPrice(settings, priceList, pass, 'couple'))
  );
  if (Array.isArray(fareOverrides)) {
    fares.forEach((_, i) => {
      if (FARES.includes(fareOverrides[i])) fares[i] = fareOverrides[i];
    });
  }
  const lines = attendees.map((guest, i) => {
    const unitPaise = toPaise(unitPrice(settings, priceList, guest.pass, fares[i]));
    const singlePaise = toPaise(unitPrice(settings, 'regular', guest.pass, 'single'));
    return { pass: guest.pass, fare: fares[i], unitPaise, savingPaise: Math.max(0, singlePaise - unitPaise) };
  });
  const people = attendees.length;
  const subtotalPaise = lines.reduce((sum, line) => sum + line.unitPaise, 0);
  const extrasPaise =
    settings.chargesConfirmed && settings.extraPerPerson != null && settings.extraPerBooking != null
      ? people * toPaise(settings.extraPerPerson) + toPaise(settings.extraPerBooking)
      : null;
  const totalPaise = extrasPaise === null ? null : subtotalPaise + extrasPaise;
  const depositPaise =
    totalPaise === null ? null : Math.min(totalPaise, people * toPaise(settings.depositPerPerson ?? 500));
  const payNowPaise = totalPaise === null ? null : prebook ? depositPaise : totalPaise;
  return {
    plan: prebook ? 'prebook' : 'full',
    priceList,
    people,
    lines,
    subtotalPaise,
    extrasPaise,
    totalPaise,
    payNowPaise,
    balancePaise: totalPaise === null ? null : totalPaise - payNowPaise,
    savingPaise: lines.reduce((sum, line) => sum + line.savingPaise, 0),
  };
}
