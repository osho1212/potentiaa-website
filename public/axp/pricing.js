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
 *  2. The fare, once per person, worked out separately for Silver and Gold.
 *     Four or more on the same pass make a group, and all of them pay the
 *     group price. Otherwise two people of different genders on the same pass
 *     make a couple and pay the same lower price; everyone else pays single.
 *
 * Amounts are worked in paise so rupee prices never pick up rounding errors.
 */

export const GENDERS = Object.freeze(['woman', 'man', 'nonbinary']);
export const GENDER_LABELS = Object.freeze({ woman: 'Woman', man: 'Man', nonbinary: 'Non-binary' });
export const PASS_LABELS = Object.freeze({ normal: 'Silver', alcohol: 'Gold' });
export const FARE_LABELS = Object.freeze({ single: 'Single', couple: 'Couple', group: 'Group' });
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
 * @param {{ pass?: string, gender?: string }[]} attendees
 * @returns {Fare[]}
 */
export function assignFares(attendees) {
  /** @type {Fare[]} */
  const fares = attendees.map(() => 'single');
  for (const pass of ['normal', 'alcohol']) {
    const members = [];
    attendees.forEach((guest, i) => {
      if (guest.pass === pass) members.push(i);
    });
    if (members.length >= GROUP_SIZE) {
      for (const i of members) fares[i] = 'group';
      continue;
    }
    // Two or three on one pass: the first pair of different genders is the
    // couple. With three, which pair it is never changes the total.
    pairing: for (let x = 0; x < members.length; x++) {
      for (let y = x + 1; y < members.length; y++) {
        const a = attendees[members[x]].gender;
        const b = attendees[members[y]].gender;
        if (a && b && a !== b) {
          fares[members[x]] = 'couple';
          fares[members[y]] = 'couple';
          break pairing;
        }
      }
    }
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
 * totalPaise is null while the organiser has not confirmed final charges.
 * @param {{ pass?: string, gender?: string }[]} attendees
 * @param {Record<string, any>} settings
 * @param {{ plan?: string, earlyBird?: boolean }} [options]
 * @returns {Quote}
 */
export function quoteBooking(attendees, settings, { plan = 'full', earlyBird = false } = {}) {
  const prebook = plan === 'prebook';
  const priceList = !prebook && earlyBird ? 'early' : 'regular';
  const fares = assignFares(attendees);
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
