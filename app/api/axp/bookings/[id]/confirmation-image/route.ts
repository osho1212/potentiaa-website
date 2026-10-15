import { NextRequest, NextResponse } from 'next/server';
import { findBookingById } from '@/lib/axp/storage-adapter';
import { generateConfirmationSvg } from '@/lib/axp/confirmation-image';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await findBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Confirmation image is available only after payment is verified.' },
        { status: 403 }
      );
    }

    const { svg } = await generateConfirmationSvg(booking);

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="aagaz-${booking.id}.svg"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not prepare confirmation image.' },
      { status: 500 }
    );
  }
}
