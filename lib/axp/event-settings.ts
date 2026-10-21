export interface EventSettings {
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  barCloseTime: string;
  eventSubtitle: string;
  eventTagline: string;
  eventDescription: string;
  eventHighlights: string;
  instagramHandle: string;
  venueName: string;
  venueLocation: string;
  venueMapQuery: string;
  venueMapsUrl: string;
  supportPhone: string;
  supportEmail: string;
  alertEmail: string;
  potentiaaPhone: string;
  potentiaaLogo: string;
  avyantaPhone: string;
  avyantaLogo: string;
  whatsappEnabled: boolean;
  merchantName: string;
  paymentUrl: string;
  merchantLegalName: string;
  merchantAddress: string;
  merchantEmail: string;
  merchantGstin: string;
  normalPrice: number;
  alcoholPrice: number;
  /** Each, for a couple on the same pass or anyone in a booking of 4+. */
  normalGroupPrice: number;
  alcoholGroupPrice: number;
  normalDescription: string;
  alcoholDescription: string;
  /** Early bird: full payment only, until the end time or the cap. */
  earlyBirdEnabled: boolean;
  earlyBirdEndDate: string;
  earlyBirdEndTime: string;
  earlyBirdCap: number;
  earlyNormalPrice: number;
  earlyAlcoholPrice: number;
  earlyNormalGroupPrice: number;
  earlyAlcoholGroupPrice: number;
  /** Pre-booking: a deposit per person now, the balance later at regular prices. */
  prebookEnabled: boolean;
  depositPerPerson: number;
  /** Balance reminder emails to pre-bookings, sent on these IST dates (YYYY-MM-DD, comma separated). */
  remindersEnabled: boolean;
  reminderDates: string;
  capacity: number;
  warningAt: number;
  maxPerBooking: number;
  extraPerPerson: number | null;
  extraPerBooking: number | null;
  chargesConfirmed: boolean;
}

/** The most people one booking can hold. Larger groups contact the organisers. */
export const MAX_PER_BOOKING_LIMIT = 10;

export const DEFAULT_SETTINGS: Readonly<EventSettings> = Object.freeze({
  eventName: 'Aagaz',
  eventDate: '2026-11-06',
  startTime: '15:00',
  endTime: '00:00',
  barCloseTime: '22:00',
  eventSubtitle: 'A private Diwali sundowner',
  eventTagline: 'Where connections become celebrations.',
  eventHighlights:
    'Networking, Curated business pop-ups, Poker & chess, Open stage, DJ & music, Food & drinks, Fireworks finale',
  instagramHandle: '@axpsocial',
  eventDescription:
    'Aagaz is the first gathering of AxP Social: an afternoon at a restored Himalayan haveli that unfolds into an evening. A small and considered guest list, food and drink through the day, music as the light goes, and the kind of conversation that only happens when a room is the right size. Every pass is named, and the number of them is limited.',
  venueName: 'Sukh Saklana Haveli: Royalty',
  venueLocation: 'Rishikesh, Uttarakhand',
  venueMapQuery: '30.205913,78.233515',
  venueMapsUrl: 'https://maps.app.goo.gl/6jjs4SCLQUx6tTKt6',
  supportPhone: '+91 9897798748',
  supportEmail: '',
  alertEmail: '',
  potentiaaPhone: '+91 82678 39736',
  potentiaaLogo: '/axp/potentiaa-logo.png',
  avyantaPhone: '+91 9897798748',
  avyantaLogo: '/axp/avyanta-logo.png',
  whatsappEnabled: false,
  merchantName: 'Potentiaa',
  paymentUrl: 'https://razorpay.me/@avyantahotels',
  merchantLegalName: 'Potentiaa',
  merchantAddress: 'Building No. 23, Shikhupur, Devpura, Haridwar, Uttarakhand 249401',
  merchantEmail: 'contact@potentiaa.com',
  merchantGstin: '',
  normalPrice: 2999,
  alcoholPrice: 3999,
  normalGroupPrice: 2599,
  alcoholGroupPrice: 3499,
  normalDescription: 'Entry, with soft drinks and mocktails through the evening.',
  alcoholDescription: 'Entry, with soft drinks and mocktails through the evening, and Gold benefits for guests aged 21 and over. Details to be announced.',
  earlyBirdEnabled: true,
  earlyBirdEndDate: '2026-10-27',
  earlyBirdEndTime: '23:59',
  earlyBirdCap: 60,
  earlyNormalPrice: 2699,
  earlyAlcoholPrice: 3599,
  earlyNormalGroupPrice: 2450,
  earlyAlcoholGroupPrice: 3250,
  prebookEnabled: true,
  depositPerPerson: 500,
  remindersEnabled: true,
  reminderDates: '2026-11-01, 2026-11-03',
  capacity: 200,
  warningAt: 150,
  maxPerBooking: 10,
  extraPerPerson: 0,
  extraPerBooking: 0,
  chargesConfirmed: true,
});

/**
 * Settings added after the first events went live. Stored documents predate
 * them, so a missing key falls back to its default instead of failing
 * validation and locking the organiser out of the settings form.
 */
const OPTIONAL_WITH_DEFAULTS = [
  'eventSubtitle',
  'eventTagline',
  'eventDescription',
  'eventHighlights',
  'instagramHandle',
  'merchantLegalName',
  'merchantAddress',
  'merchantEmail',
  'merchantGstin',
  'venueMapQuery',
  'venueMapsUrl',
  'potentiaaPhone',
  'potentiaaLogo',
  'avyantaPhone',
  'avyantaLogo',
  'earlyBirdEndDate',
  'earlyBirdEndTime',
  'reminderDates',
];

/** Prices, switches and limits added with couple, group, early-bird and pre-booking pricing. */
const NEW_NUMBERS_WITH_DEFAULTS = [
  'normalGroupPrice',
  'alcoholGroupPrice',
  'earlyNormalPrice',
  'earlyAlcoholPrice',
  'earlyNormalGroupPrice',
  'earlyAlcoholGroupPrice',
  'depositPerPerson',
] as const;

/**
 * The no-API-key Google Maps embed. Takes either "lat,lng" or a place query.
 */
export function buildMapEmbedUrl(query: string): string {
  const q = (query || '').trim();
  if (!q) return '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&hl=en&output=embed`;
}

export function validateSettings(input: any): EventSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Enter valid event settings.');
  }

  const out: any = {};
  const textFields: Record<string, number> = {
    eventName: 80,
    eventDate: 10,
    startTime: 5,
    endTime: 5,
    barCloseTime: 5,
    eventSubtitle: 120,
    eventTagline: 160,
    eventDescription: 900,
    eventHighlights: 400,
    instagramHandle: 40,
    venueName: 160,
    venueLocation: 160,
    // The organiser form has had the map and brand fields below since they
    // were added, but they were never copied into the saved settings, so any
    // edit to them was silently dropped on save.
    venueMapQuery: 200,
    venueMapsUrl: 500,
    supportPhone: 30,
    supportEmail: 180,
    alertEmail: 180,
    potentiaaPhone: 30,
    potentiaaLogo: 300,
    avyantaPhone: 30,
    avyantaLogo: 300,
    merchantName: 120,
    merchantLegalName: 160,
    merchantAddress: 500,
    merchantEmail: 180,
    merchantGstin: 15,
    paymentUrl: 500,
    normalDescription: 500,
    alcoholDescription: 500,
    earlyBirdEndDate: 10,
    earlyBirdEndTime: 5,
    reminderDates: 120,
  };

  for (const [key, max] of Object.entries(textFields)) {
    const value =
      OPTIONAL_WITH_DEFAULTS.includes(key) && input[key] === undefined
        ? (DEFAULT_SETTINGS as any)[key]
        : input[key];
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f]/.test(value)) {
      throw new Error(`Check ${key}.`);
    }
    out[key] = value.trim();
  }

  for (const key of [
    'eventName',
    'venueName',
    'venueLocation',
    'supportPhone',
    'merchantName',
    'merchantLegalName',
    'merchantAddress',
    'merchantEmail',
    'normalDescription',
    'alcoholDescription',
  ]) {
    if (!out[key]) throw new Error(`Enter ${key}.`);
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(out.eventDate) ||
    Number.isNaN(Date.parse(out.eventDate + 'T00:00:00Z')) ||
    new Date(out.eventDate + 'T00:00:00Z').toISOString().slice(0, 10) !== out.eventDate
  ) {
    throw new Error('Enter a valid event date.');
  }

  for (const key of ['startTime', 'endTime', 'barCloseTime']) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(out[key])) throw new Error('Check event times.');
  }

  if (
    !/^\+?[\d ()-]{8,30}$/.test(out.supportPhone) ||
    out.supportPhone.replace(/\D/g, '').length > 15
  ) {
    throw new Error('Check the support phone number.');
  }

  for (const key of ['potentiaaPhone', 'avyantaPhone']) {
    const value = out[key];
    if (value && (!/^\+?[\d ()-]{8,30}$/.test(value) || value.replace(/\D/g, '').length > 15)) {
      throw new Error('Check the POTENTIAA and AVYANTA phone numbers.');
    }
  }

  for (const key of ['potentiaaLogo', 'avyantaLogo']) {
    const value = out[key];
    if (value && !/^\/[\w\-./]+\.(?:png|jpg|jpeg|webp|svg)$/i.test(value)) {
      throw new Error('Each logo must be a site path such as /axp/potentiaa-logo.png.');
    }
  }

  if (out.venueMapsUrl) {
    let mapsUrl: URL;
    try {
      mapsUrl = new URL(out.venueMapsUrl);
    } catch {
      throw new Error('Enter a valid Google Maps link.');
    }
    if (
      mapsUrl.protocol !== 'https:' ||
      !['maps.app.goo.gl', 'goo.gl', 'maps.google.com', 'www.google.com', 'google.com'].includes(
        mapsUrl.hostname
      )
    ) {
      throw new Error('Use an HTTPS Google Maps link.');
    }
    out.venueMapsUrl = mapsUrl.href;
  }

  for (const key of ['supportEmail', 'alertEmail', 'merchantEmail']) {
    if (out[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out[key])) {
      throw new Error('Check email addresses.');
    }
  }

  out.merchantGstin = out.merchantGstin.toUpperCase();
  if (out.merchantGstin && !/^[0-9A-Z]{15}$/.test(out.merchantGstin)) {
    throw new Error('Enter a 15-character GSTIN.');
  }

  let url: URL;
  try {
    url = new URL(out.paymentUrl);
  } catch {
    throw new Error('Enter a valid Razorpay URL.');
  }
  if (
    url.protocol !== 'https:' ||
    !['razorpay.me', 'pages.razorpay.com', 'rzp.io', 'rzp.io.in'].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error('Use an HTTPS Razorpay payment URL.');
  }
  out.paymentUrl = url.href;

  for (const key of ['normalPrice', 'alcoholPrice', ...NEW_NUMBERS_WITH_DEFAULTS, 'extraPerPerson', 'extraPerBooking']) {
    // A form saved before these prices existed does not send them.
    const value =
      (NEW_NUMBERS_WITH_DEFAULTS as readonly string[]).includes(key) && input[key] == null
        ? (DEFAULT_SETTINGS as any)[key]
        : input[key];
    if ((key === 'extraPerPerson' || key === 'extraPerBooking') && value === null) {
      out[key] = null;
      continue;
    }
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1000000 ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.00001
    ) {
      throw new Error('Prices and charges must be valid rupee amounts with up to two decimals.');
    }
    if (key !== 'extraPerPerson' && key !== 'extraPerBooking' && value === 0) {
      throw new Error('Pass prices and the pre-booking deposit must be greater than zero.');
    }
    out[key] = value;
  }

  if (out.depositPerPerson > Math.min(out.normalPrice, out.normalGroupPrice, out.alcoholPrice, out.alcoholGroupPrice)) {
    throw new Error('The pre-booking deposit cannot be more than the cheapest regular price.');
  }

  for (const [key, min, max] of [
    ['capacity', 1, 10000],
    ['warningAt', 1, 10000],
    ['maxPerBooking', 1, MAX_PER_BOOKING_LIMIT],
    ['earlyBirdCap', 0, 10000],
  ] as const) {
    const v = key === 'earlyBirdCap' && input[key] == null ? DEFAULT_SETTINGS.earlyBirdCap : input[key];
    if (!Number.isInteger(v) || v < min || v > max) throw new Error(`Check ${key}.`);
    out[key] = v;
  }

  if (out.warningAt > out.capacity) {
    throw new Error('Early warning cannot exceed capacity.');
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(out.earlyBirdEndDate) ||
    Number.isNaN(Date.parse(out.earlyBirdEndDate + 'T00:00:00Z')) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(out.earlyBirdEndTime)
  ) {
    throw new Error('Enter a valid early-bird end date and time.');
  }

  // Reminder dates: any number up to ten, each a real date, kept in order.
  const reminderDates = out.reminderDates
    ? out.reminderDates.split(',').map((part: string) => part.trim()).filter(Boolean)
    : [];
  if (
    reminderDates.length > 10 ||
    reminderDates.some(
      (day: string) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        Number.isNaN(Date.parse(day + 'T00:00:00Z')) ||
        new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) !== day
    )
  ) {
    throw new Error('Enter balance reminder dates as YYYY-MM-DD, separated by commas.');
  }
  out.reminderDates = [...new Set(reminderDates)].sort().join(', ');

  for (const key of ['whatsappEnabled', 'earlyBirdEnabled', 'prebookEnabled', 'remindersEnabled'] as const) {
    out[key] = typeof input[key] === 'boolean' ? input[key] : DEFAULT_SETTINGS[key];
  }

  if (typeof input.chargesConfirmed !== 'boolean') {
    throw new Error('Check whether final charges are confirmed.');
  }
  out.chargesConfirmed = input.chargesConfirmed;

  if (out.chargesConfirmed && (out.extraPerPerson === null || out.extraPerBooking === null)) {
    throw new Error('Set both charges, including an explicit zero if none, before confirming them.');
  }

  return out as EventSettings;
}
