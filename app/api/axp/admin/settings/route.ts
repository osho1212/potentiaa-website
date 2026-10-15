import { NextRequest, NextResponse } from 'next/server';
import { getEventSettings, updateEventSettings } from '@/lib/axp/storage-adapter';

export async function GET() {
  try {
    const data = await getEventSettings();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to read settings.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = await updateEventSettings(body.settings || body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update settings.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = await updateEventSettings(body.settings || body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update settings.' }, { status: 400 });
  }
}

