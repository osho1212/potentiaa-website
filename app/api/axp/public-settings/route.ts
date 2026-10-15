import { NextResponse } from 'next/server';
import { getEventSettings } from '@/lib/axp/storage-adapter';

export async function GET() {
  try {
    const { settings, revision } = await getEventSettings();
    const { paymentUrl, alertEmail, ...publicSettings } = settings;
    return NextResponse.json(
      { settings: publicSettings, revision },
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
