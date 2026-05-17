import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireGymAccess } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId') || undefined;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const plan = searchParams.get('plan') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const { error, activeGymId } = await requireGymAccess(gymId);
    if (error) return error;
    if (!activeGymId) return NextResponse.json({ members: [], total: 0, page: 1, totalPages: 0 });

    const where: Record<string, unknown> = { gymId: activeGymId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phoneNumber: { contains: search } },
        { memberId: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (plan) where.membershipPlan = plan;

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    const [members, total] = await Promise.all([
      db.member.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { transactions: { orderBy: { paymentDate: 'desc' } } },
      }),
      db.member.count({ where }),
    ]);

    return NextResponse.json({ members, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('GET members error:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gymId: reqGymId, name, phoneNumber, membershipPlan, durationMonths, durationDays, planPrice, planId, paymentMode, amount, joinDate } = body;

    const { error, activeGymId } = await requireGymAccess(reqGymId);
    if (error) return error;
    if (!activeGymId) return NextResponse.json({ error: 'No gym selected. Please select a gym first.' }, { status: 400 });

    // Server-side validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Member name is required' }, { status: 400 });
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    if (phoneNumber.trim().replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Phone number must be at least 10 digits' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'Amount must be a non-negative number' }, { status: 400 });
    }

    const lastMember = await db.member.findFirst({
      where: { gymId: activeGymId },
      orderBy: { createdAt: 'desc' },
    });
    let nextNum = 1;
    if (lastMember) {
      const numStr = lastMember.memberId.replace('GYM-', '');
      nextNum = parseInt(numStr) + 1;
    }
    const memberId = `GYM-${String(nextNum).padStart(3, '0')}`;

    const start = joinDate ? new Date(joinDate) : new Date();
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Invalid join date' }, { status: 400 });
    }
    const expiry = new Date(start);
    // Use durationDays if provided (custom plans), otherwise use durationMonths
    if (typeof durationDays === 'number' && durationDays > 0) {
      expiry.setDate(expiry.getDate() + durationDays);
    } else {
      expiry.setMonth(expiry.getMonth() + (durationMonths || 1));
    }

    const isCash = paymentMode === 'Cash';
    const cashAmt = isCash ? (amount || 0) : 0;
    const upiAmt = !isCash ? (amount || 0) : 0;

    const member = await db.member.create({
      data: {
        gymId: activeGymId,
        memberId,
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        joinDate: start,
        expiryDate: expiry,
        membershipPlan: membershipPlan || '1 Month',
        durationMonths: durationMonths || Math.round((durationDays || 30) / 30.44),
        planPrice: planPrice || 0,
        currentCashPayment: cashAmt,
        currentUpiPayment: upiAmt,
        totalPayment: amount || 0,
        totalCash: cashAmt,
        totalUpi: upiAmt,
        pendingPayment: (planPrice || 0) - (amount || 0),
        status: 'Active',
        planId: planId || null,
      },
    });

    await db.transaction.create({
      data: {
        gymId: activeGymId,
        memberId: member.id,
        paymentMode: paymentMode || 'Cash',
        amount: amount || 0,
        plan: membershipPlan || '1 Month',
        duration: durationMonths || 1,
        paymentDate: start,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('POST member error:', error);
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, refundAmount, pendingPayment, ...data } = body;
    if (!id) return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    if (!name || !name.trim()) return NextResponse.json({ error: 'Member name is required' }, { status: 400 });

    const updateData: Record<string, unknown> = { name: name.trim(), ...data };

    // Handle refund amount - add to existing refundAmount
    if (typeof refundAmount === 'number' && refundAmount > 0) {
      const current = await db.member.findUnique({ where: { id } });
      if (current) {
        updateData.refundAmount = (current.refundAmount || 0) + refundAmount;
      }
    }

    // Handle pending payment adjustment
    if (typeof pendingPayment === 'number') {
      updateData.pendingPayment = pendingPayment;
    }

    const member = await db.member.update({ where: { id }, data: updateData });
    return NextResponse.json(member);
  } catch (error) {
    console.error('PUT member error:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    await db.member.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE member error:', error);
    if (error instanceof Error && error.message.includes('Record to delete not found')) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
}
