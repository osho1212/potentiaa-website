import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { sendBalanceReminders } from '@/lib/axp/balance-reminders';

/**
 * The dashboard's "Send balance reminders now": the same reminder the
 * scheduled run sends, on any day. A booking already reminded today is
 * skipped, so pressing it twice does not email anyone twice.
 */
export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const run = await sendBalanceReminders({ mode: body?.mode === 'test' ? 'test' : 'live', force: true });
    return NextResponse.json(run);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Reminders could not be sent.' }, { status: 500 });
  }
}
