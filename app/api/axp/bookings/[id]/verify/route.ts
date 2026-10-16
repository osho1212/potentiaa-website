import { NextRequest, NextResponse } from 'next/server';
import { findBookingById, saveBooking } from '@/lib/axp/storage-adapter';
import { verifyRazorpaySignature } from '@/lib/axp/payment-core';
import { sendBookingConfirmationEmails } from '@/lib/axp/email-service';
import { sendBookingPassesOnWhatsApp, WhatsAppDeliveryResult } from '@/lib/axp/whatsapp-service';
import { DEFAULT_SETTINGS } from '@/lib/axp/event-settings';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await findBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id || booking.orderId || '',
      paymentId: razorpay_payment_id || 'mock_pay_id',
      signature: razorpay_signature || '',
      mode: booking.mode,
    });

    if (!isValid) {
      booking.status = 'paid_review';
      await saveBooking(booking);
      return NextResponse.json(
        { error: 'Payment signature could not be verified. Contact event support.' },
        { status: 400 }
      );
    }

    booking.status = 'confirmed';
    booking.paymentId = razorpay_payment_id;

    const settings = { ...DEFAULT_SETTINGS, ...(booking.snapshot?.settings || {}) };

    // Send confirmation emails from server immediately
    let emailDelivery = { success: false, recipients: [] as string[] };
    try {
      emailDelivery = await sendBookingConfirmationEmails(booking);
      (booking as any).emailDelivery = emailDelivery;
    } catch (emailErr) {
      console.error('Failed to send confirmation emails from server:', emailErr);
    }

    // Each attendee gets their own pass over WhatsApp, when the organiser has
    // switched it on and the deployment carries Meta credentials.
    let whatsappDelivery: WhatsAppDeliveryResult | null = null;
    if (settings.whatsappEnabled) {
      try {
        whatsappDelivery = await sendBookingPassesOnWhatsApp(booking, settings);
        (booking as any).whatsappDelivery = whatsappDelivery;
      } catch (whatsappErr) {
        console.error('Failed to send WhatsApp passes:', whatsappErr);
      }
    }

    await saveBooking(booking);

    return NextResponse.json({
      id: booking.id,
      mode: booking.mode,
      status: booking.status,
      expiresAt: booking.expiresAt,
      people: booking.guestCount,
      total: booking.amountPaise / 100,
      currency: booking.currency,
      buyer: booking.buyer,
      attendees: booking.attendees,
      pricing: {
        normalPrice: settings.normalPrice,
        alcoholPrice: settings.alcoholPrice,
        subtotal: booking.amountPaise / 100,
        extraCharges: 0,
      },
      emailDelivery,
      whatsappDelivery,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not verify payment.' },
      { status: 500 }
    );
  }
}
