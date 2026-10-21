import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/axp/payment-core';
import { sendBalanceReminders } from '@/lib/axp/balance-reminders';

/**
 * Called by Vercel Cron every morning (vercel.json). It sends only on the
 * reminder dates in organiser settings, so most mornings it does nothing.
 *
 * Vercel signs the call with CRON_SECRET. Without that secret set, a deployed
 * site refuses every call: anyone could otherwise make it email every guest
 * with a balance due.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Reminders] CRON_SECRET is not set; refusing the cron call.');
      return NextResponse.json({ error: 'Reminders are not configured.' }, { status: 503 });
    }
  } else if (!safeEqual(request.headers.get('authorization') || '', `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  try {
    const run = await sendBalanceReminders({ mode: 'live' });
    if (run.due) console.log(`[Reminders] ${run.today}: sent ${run.sent}, failed ${run.failed}, already reminded ${run.skipped}.`);
    return NextResponse.json(run);
  } catch (error: any) {
    console.error('[Reminders] Run failed:', error);
    return NextResponse.json({ error: error?.message || 'Reminders failed.' }, { status: 500 });
  }
}
