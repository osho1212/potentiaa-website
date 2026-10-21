import { NextRequest, NextResponse } from 'next/server';
import { getEventSettings, listAllBookings } from '@/lib/axp/storage-adapter';
import { earlyBirdStatus } from '@/lib/axp/early-bird';

export async function GET(request: NextRequest) {
  try {
    const { settings, revision } = await getEventSettings();
    const { paymentUrl, alertEmail, ...publicSettings } = settings;
    const mode = new URL(request.url).searchParams.get('mode') === 'test' ? 'test' : 'live';
    // Where the early bird stands, for the countdown and "passes left". The
    // server decides again when a booking is made, so this is display only.
    let earlyBird = null;
    try {
      const { sold: _sold, ...status } = earlyBirdStatus(settings, await listAllBookings(), mode);
      earlyBird = status;
    } catch (error) {
      console.error('[Settings] Early-bird status unavailable:', error);
    }
    return NextResponse.json(
      { settings: publicSettings, revision, earlyBird },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Event settings could not be loaded.' },
      { status: 503 }
    );
  }
}
