import { NextRequest, NextResponse } from 'next/server';
import { listStallEnquiries } from '@/lib/axp/stall-enquiries';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';

export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
  }
  try {
    return NextResponse.json(
      { enquiries: await listStallEnquiries() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Stall enquiries could not be loaded.' },
      { status: 500 }
    );
  }
}
