import { NextRequest, NextResponse } from 'next/server';
import { validateStallEnquiry, saveStallEnquiry } from '@/lib/axp/stall-enquiries';

/**
 * Public endpoint for a business applying for a stall. It takes an enquiry and
 * nothing else: no payment, no reservation, no account.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const enquiry = await saveStallEnquiry(validateStallEnquiry(body));
    return NextResponse.json(
      { id: enquiry.id, status: enquiry.status },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Your stall enquiry could not be sent.' },
      { status: 400 }
    );
  }
}
