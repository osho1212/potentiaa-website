import { NextResponse } from 'next/server';
import { getRazorpayCredentials } from '@/lib/axp/payment-core';

export async function GET() {
  try {
    const creds = getRazorpayCredentials('live');
    const testCreds = getRazorpayCredentials('test');
    const salesOpen = creds.isConfigured || testCreds.isConfigured || process.env.NODE_ENV !== 'production';

    const emailjs = {
      serviceId: process.env.NEXT_PUBLIC_EMAILJS_AXP_SERVICE_ID || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_59d1ylv',
      templateId: process.env.NEXT_PUBLIC_EMAILJS_AXP_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_x1xmkvu',
      publicKey: process.env.NEXT_PUBLIC_EMAILJS_AXP_PUBLIC_KEY || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'wUJPfRnz1y09Ms68T',
    };

    return NextResponse.json(
      {
        salesOpen: true, // Enabled for preview and bookings
        isRazorpayConfigured: creds.isConfigured || testCreds.isConfigured,
        deliveryMode: 'email',
        emailjs,
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
