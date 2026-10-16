import { NextResponse } from 'next/server';
import { getRazorpayCredentials } from '@/lib/axp/payment-core';

export async function GET() {
  try {
    const creds = getRazorpayCredentials('live');
    const testCreds = getRazorpayCredentials('test');
    const salesOpen = creds.isConfigured || testCreds.isConfigured || process.env.NODE_ENV !== 'production';

    return NextResponse.json(
      {
        salesOpen: true, // Enabled for preview and bookings
        isRazorpayConfigured: creds.isConfigured || testCreds.isConfigured,
        deliveryMode: 'email',
        message: 'Bookings are open.',
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Payment config check failed.' },
      { status: 500 }
    );
  }
}
