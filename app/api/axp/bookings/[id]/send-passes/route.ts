import { NextRequest, NextResponse } from 'next/server';
import { deliverPasses, PassDeliveryError } from '@/lib/axp/pass-delivery';

/**
 * Asked for by the guest's confirmation screen, and by its Resend button.
 *
 * Without { resend: true } this only sends if no earlier send has succeeded,
 * so loading the confirmation screen never produces a second email; it is how
 * a booking confirmed by the webhook, whose guest never got an email, gets
 * one. With it, the email goes again, at most once every couple of minutes.
 *
 * Access follows the rest of the booking routes: the booking id is the key,
 * and the only addresses this can ever send to are the booking's own.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const outcome = await deliverPasses(id, { resend: body?.resend === true });

    if (outcome.retryAfterSeconds) {
      return NextResponse.json(
        {
          error: `Your passes were just sent. Please wait ${outcome.retryAfterSeconds} seconds before sending them again.`,
          retryAfterSeconds: outcome.retryAfterSeconds,
          recipients: outcome.recipients,
        },
        { status: 429, headers: { 'Retry-After': String(outcome.retryAfterSeconds), 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      {
        sent: outcome.emailed.length > 0,
        alreadySent: outcome.alreadySent,
        emailed: outcome.emailed,
        recipients: outcome.recipients,
        success: !!outcome.emailDelivery?.success,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    const status = error instanceof PassDeliveryError ? error.status : 500;
    return NextResponse.json(
      { error: error?.message || 'Your passes could not be sent.' },
      { status }
    );
  }
}
