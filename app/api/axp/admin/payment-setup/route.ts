import { NextResponse } from 'next/server';
import { getRazorpayCredentials } from '@/lib/axp/payment-core';
import { getEventSettings } from '@/lib/axp/storage-adapter';

export async function GET() {
  try {
    const liveCreds = getRazorpayCredentials('live');
    const testCreds = getRazorpayCredentials('test');
    const { settings } = await getEventSettings();

    const testReady = testCreds.isConfigured || process.env.NODE_ENV !== 'production';
    const liveReady = liveCreds.isConfigured && settings.chargesConfirmed;

    return NextResponse.json({
      testReady,
      liveReady,
      isTestConfigured: testCreds.isConfigured,
      isLiveConfigured: liveCreds.isConfigured,
      chargesConfirmed: settings.chargesConfirmed,
      merchantName: settings.merchantName,
      normalPrice: settings.normalPrice,
      alcoholPrice: settings.alcoholPrice,
      capacity: settings.capacity,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Readiness check failed.' }, { status: 500 });
  }
}
