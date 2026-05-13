import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireGymAccess } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId') || undefined;

    const { error, activeGymId } = await requireGymAccess(gymId);
    if (error) return error;
    if (!activeGymId) return NextResponse.json({ openingCashBalance: 0, openingUpiBalance: 0 });

    let settings = await db.settings.findUnique({ where: { gymId: activeGymId } });
    if (!settings) {
      settings = await db.settings.create({
        data: { gymId: activeGymId, openingCashBalance: 0, openingUpiBalance: 0 },
      });
    }
    return NextResponse.json({
      openingCashBalance: settings.openingCashBalance,
      openingUpiBalance: settings.openingUpiBalance,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { gymId: reqGymId, openingCashBalance, openingUpiBalance } = body;

    const { error, activeGymId } = await requireGymAccess(reqGymId);
    if (error) return error;
    if (!activeGymId) return NextResponse.json({ error: 'No gym selected' }, { status: 400 });

    const settings = await db.settings.upsert({
      where: { gymId: activeGymId },
      update: { openingCashBalance, openingUpiBalance },
      create: { gymId: activeGymId, openingCashBalance, openingUpiBalance },
    });

    return NextResponse.json({
      openingCashBalance: settings.openingCashBalance,
      openingUpiBalance: settings.openingUpiBalance,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
