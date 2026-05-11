import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET settings
export async function GET() {
  try {
    let settings = await db.settings.findUnique({ where: { id: 'main' } });
    if (!settings) {
      settings = await db.settings.create({
        data: { id: 'main', openingCashBalance: 0, openingUpiBalance: 0 },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { openingCashBalance, openingUpiBalance } = body;

    const settings = await db.settings.upsert({
      where: { id: 'main' },
      update: { openingCashBalance, openingUpiBalance },
      create: { id: 'main', openingCashBalance, openingUpiBalance },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('PUT settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
