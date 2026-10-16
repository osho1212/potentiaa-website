export interface EventSettings {
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  barCloseTime: string;
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
  normalDescription: string;
  alcoholDescription: string;
  capacity: number;
  warningAt: number;
  maxPerBooking: number;
  extraPerPerson: number | null;
  extraPerBooking: number | null;
  chargesConfirmed: boolean;
}

export const DEFAULT_SETTINGS: Readonly<EventSettings> = Object.freeze({
  eventName: 'Aagaz',
  eventDate: '2026-11-06',
  startTime: '15:00',
  endTime: '00:00',
  barCloseTime: '22:00',
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
  merchantName: 'Avyanta Hotels',
  paymentUrl: 'https://razorpay.me/@avyantahotels',
  merchantLegalName: 'KGS GLOBAL PRIVATE LIMITED',
  merchantAddress: 'B-3, Ganga Nagri, Shivalik Nagar, Haridwar-249402, Uttarakhand',
  merchantEmail: 'kgsglobalpvtltd@gmail.com',
  merchantGstin: '05AAMCK1954E1ZL',
  normalPrice: 2999,
  alcoholPrice: 3999,
  normalDescription: 'Entry + unlimited non-alcoholic drinks.',
  alcoholDescription: 'Entry + unlimited non-alcoholic drinks + 8 alcoholic drink coupons. Exact menu and measures to be confirmed.',
  capacity: 200,
  warningAt: 150,
  maxPerBooking: 5,
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
];

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
    venueName: 160,
    venueLocation: 160,
    supportPhone: 30,
    supportEmail: 180,
    alertEmail: 180,
    merchantName: 120,
    merchantLegalName: 160,
    merchantAddress: 500,
    merchantEmail: 180,
    merchantGstin: 15,
    paymentUrl: 500,
    normalDescription: 500,
    alcoholDescription: 500,
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

  for (const key of ['normalPrice', 'alcoholPrice', 'extraPerPerson', 'extraPerBooking']) {
    const value = input[key];
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
    if ((key === 'normalPrice' || key === 'alcoholPrice') && value === 0) {
      throw new Error('Pass prices must be greater than zero.');
    }
    out[key] = value;
  }

  for (const [key, max] of [
    ['capacity', 10000],
    ['warningAt', 10000],
    ['maxPerBooking', 5],
  ] as const) {
    const v = input[key];
    if (!Number.isInteger(v) || v < 1 || v > max) throw new Error(`Check ${key}.`);
    out[key] = v;
  }

  if (out.warningAt > out.capacity) {
    throw new Error('Early warning cannot exceed capacity.');
  }

  out.whatsappEnabled =
    typeof input.whatsappEnabled === 'boolean'
      ? input.whatsappEnabled
      : DEFAULT_SETTINGS.whatsappEnabled;

  if (typeof input.chargesConfirmed !== 'boolean') {
    throw new Error('Check whether final charges are confirmed.');
  }
  out.chargesConfirmed = input.chargesConfirmed;

  if (out.chargesConfirmed && (out.extraPerPerson === null || out.extraPerBooking === null)) {
    throw new Error('Set both charges, including an explicit zero if none, before confirming them.');
  }

  return out as EventSettings;
}
