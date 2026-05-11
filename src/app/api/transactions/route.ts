import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
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

// POST create transaction (renewal)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, paymentMode, amount, plan, duration, paymentDate } = body;

    // Get member
    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const durMonths = duration || 1;
    const isCash = paymentMode === 'Cash';
    const payAmt = amount || 0;
    const cashAmt = isCash ? payAmt : 0;
    const upiAmt = !isCash ? payAmt : 0;

    // Calculate new expiry
    const start = paymentDate ? new Date(paymentDate) : new Date();
    const currentExpiry = new Date(member.expiryDate);
    const baseDate = currentExpiry > new Date() ? currentExpiry : start;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + durMonths);

    // Determine status
    const now = new Date();
    const daysUntilExpiry = Math.ceil((newExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let newStatus = 'Expired';
    if (daysUntilExpiry > 7) newStatus = 'Active';
    else if (daysUntilExpiry > 0) newStatus = 'Expiring Soon';

    // Update member
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
        pendingPayment: Math.max(0, member.pendingPayment + (payAmt - payAmt)),
        status: newStatus,
      },
    });

    // Create transaction record
    await db.transaction.create({
      data: {
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
