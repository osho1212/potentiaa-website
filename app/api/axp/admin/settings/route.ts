import { NextRequest, NextResponse } from 'next/server';
import { getEventSettings, updateEventSettings } from '@/lib/axp/storage-adapter';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { isWhatsAppConfigured } from '@/lib/axp/whatsapp-service';

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const data = await getEventSettings();
    return NextResponse.json({ ...data, whatsappConfigured: isWhatsAppConfigured() });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to read settings.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const body = await request.json();
    const updated = await updateEventSettings(body.settings || body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update settings.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const body = await request.json();
    const updated = await updateEventSettings(body.settings || body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update settings.' }, { status: 400 });
  }
}

