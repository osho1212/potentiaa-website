import { NextRequest, NextResponse } from 'next/server';
import {
  validatePin,
  createAdminSessionToken,
  verifyAdminAuth,
  isAdminAuthConfigured,
  ADMIN_SESSION_COOKIE,
} from '@/lib/axp/admin-auth';

export async function GET(request: NextRequest) {
  const authenticated = verifyAdminAuth(request);
  return NextResponse.json({ authenticated });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'Please enter the organiser PIN.' }, { status: 400 });
    }

    if (!isAdminAuthConfigured()) {
      return NextResponse.json(
        { error: 'Organiser sign-in is not set up on this server. Set AXP_ADMIN_PIN and TICKET_SIGNING_SECRET.' },
        { status: 503 }
      );
    }

    if (!validatePin(pin)) {
      return NextResponse.json({ error: 'Incorrect organiser PIN. Access denied.' }, { status: 401 });
    }

    const { token, expires } = createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      message: 'Organiser session verified.',
    });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Authentication error.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Signed out.' });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
