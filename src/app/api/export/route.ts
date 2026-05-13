import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireGymAccess } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId') || undefined;

    const { error, activeGymId } = await requireGymAccess(gymId);
    if (error) return error;
    if (!activeGymId) return NextResponse.json({ error: 'No gym selected' }, { status: 400 });

    const [members, transactions, expenses, settings] = await Promise.all([
      db.member.findMany({ where: { gymId: activeGymId }, orderBy: { createdAt: 'asc' } }),
      db.transaction.findMany({ where: { gymId: activeGymId }, orderBy: { paymentDate: 'asc' }, include: { member: { select: { memberId: true, name: true } } } }),
      db.expense.findMany({ where: { gymId: activeGymId }, orderBy: { expenseDate: 'asc' } }),
      db.settings.findUnique({ where: { gymId: activeGymId } }),
    ]);

    const gym = await db.gym.findUnique({ where: { id: activeGymId } });

    const data = {
      exportDate: new Date().toISOString(),
      gym: { name: gym?.name, slug: gym?.slug },
      settings,
      members: members.map(m => ({
        memberId: m.memberId, name: m.name, phoneNumber: m.phoneNumber,
        joinDate: m.joinDate, expiryDate: m.expiryDate, membershipPlan: m.membershipPlan,
        durationMonths: m.durationMonths, planPrice: m.planPrice,
        currentCashPayment: m.currentCashPayment, currentUpiPayment: m.currentUpiPayment,
        totalPayment: m.totalPayment, totalCash: m.totalCash, totalUpi: m.totalUpi,
        pendingPayment: m.pendingPayment, refundAmount: m.refundAmount, status: m.status, notes: m.notes,
      })),
      transactions: transactions.map(t => ({
        memberId: t.member?.memberId, memberName: t.member?.name,
        paymentMode: t.paymentMode, amount: t.amount, plan: t.plan,
        duration: t.duration, paymentDate: t.paymentDate,
      })),
      expenses: expenses.map(e => ({
        category: e.category, note: e.note,
        cashAmount: e.cashAmount, upiAmount: e.upiAmount, expenseDate: e.expenseDate,
      })),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
