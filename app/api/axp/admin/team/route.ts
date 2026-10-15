import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date().toISOString();
  return NextResponse.json({
    currentUser: {
      memberId: '1',
      email: 'organiser@potentiaa.com',
      role: 'owner',
    },
    members: [
      {
        id: '1',
        email: 'organiser@potentiaa.com',
        role: 'owner',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ],
    history: [
      {
        id: '1',
        actorEmail: 'organiser@potentiaa.com',
        action: 'owner_created',
        targetEmail: 'organiser@potentiaa.com',
        occurredAt: now,
        details: {},
      },
    ],
    canManage: true,
  });
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    return NextResponse.json(
      { added: { id: Date.now().toString(), email, role: 'admin' } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to add admin.' }, { status: 400 });
  }
}

export async function DELETE() {
  return NextResponse.json({ removed: true });
}

