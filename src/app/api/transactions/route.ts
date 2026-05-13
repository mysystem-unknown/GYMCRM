import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireGymAccess, canRenewMember } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || '';
    const gymId = searchParams.get('gymId') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const { error, activeGymId } = await requireGymAccess(gymId);
    if (error) return error;
    if (!activeGymId) return NextResponse.json({ transactions: [], total: 0, page: 1, totalPages: 0 });

    const where: Record<string, unknown> = { gymId: activeGymId };
    if (memberId) where.memberId = memberId;

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { member: { select: { name: true, memberId: true } } },
      }),
      db.transaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('GET transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gymId: reqGymId, memberId, paymentMode, amount, plan, duration, paymentDate } = body;

    const { error, user, activeGymId } = await requireGymAccess(reqGymId);
    if (error) return error;
    if (!activeGymId) return NextResponse.json({ error: 'No gym selected. Please select a gym first.' }, { status: 400 });

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than 0' }, { status: 400 });
    }
    if (!canRenewMember(user)) {
      return NextResponse.json({ error: 'You do not have permission to renew memberships' }, { status: 403 });
    }

    const member = await db.member.findFirst({ where: { id: memberId, gymId: activeGymId } });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const durMonths = duration || 1;
    const isCash = paymentMode === 'Cash';
    const payAmt = amount || 0;
    const cashAmt = isCash ? payAmt : 0;
    const upiAmt = !isCash ? payAmt : 0;

    const start = paymentDate ? new Date(paymentDate) : new Date();
    const currentExpiry = new Date(member.expiryDate);
    const baseDate = currentExpiry > new Date() ? currentExpiry : start;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + durMonths);

    const daysUntilExpiry = Math.ceil((newExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    let newStatus = 'Expired';
    if (daysUntilExpiry > 7) newStatus = 'Active';
    else if (daysUntilExpiry > 0) newStatus = 'Expiring Soon';

    const updatedMember = await db.member.update({
      where: { id: memberId },
      data: {
        joinDate: start,
        expiryDate: newExpiry,
        membershipPlan: plan || member.membershipPlan,
        durationMonths: durMonths,
        planPrice: payAmt,
        currentCashPayment: cashAmt,
        currentUpiPayment: upiAmt,
        totalPayment: member.totalPayment + payAmt,
        totalCash: member.totalCash + cashAmt,
        totalUpi: member.totalUpi + upiAmt,
        status: newStatus,
      },
    });

    await db.transaction.create({
      data: {
        gymId: activeGymId,
        memberId,
        paymentMode: paymentMode || 'Cash',
        amount: payAmt,
        plan: plan || member.membershipPlan,
        duration: durMonths,
        paymentDate: start,
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('POST transaction error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
