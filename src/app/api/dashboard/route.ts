import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireGymAccess } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId') || undefined;

    const { error, activeGymId } = await requireGymAccess(gymId);
    if (error) return error;
    if (!activeGymId) return NextResponse.json({
      totalMembers: 0, activeMembers: 0, expiringSoon: 0, expiredMembers: 0,
      refundedMembers: 0, totalRevenue: 0, monthlyRevenue: 0, monthlyCash: 0,
      monthlyUpi: 0, monthlyExpenses: 0, monthlyCashExpense: 0, monthlyUpiExpense: 0,
      monthlyProfit: 0, totalCash: 0, totalUpi: 0, totalPending: 0, totalRefund: 0,
      openingCash: 0, openingUpi: 0, finalCashBalance: 0, finalUpiBalance: 0,
      finalBalance: 0, revenueByMonth: [], recentTransactions: [],
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const allMembers = await db.member.findMany({ where: { gymId: activeGymId } });

    for (const member of allMembers) {
      if (member.status === 'Refunded') continue;
      const expiry = new Date(member.expiryDate);
      const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let newStatus = 'Expired';
      if (days > 7) newStatus = 'Active';
      else if (days > 0) newStatus = 'Expiring Soon';
      if (member.status !== newStatus) {
        await db.member.update({ where: { id: member.id }, data: { status: newStatus } });
      }
    }

    const updatedMembers = await db.member.findMany({ where: { gymId: activeGymId } });
    const totalMembers = updatedMembers.length;
    const activeMembers = updatedMembers.filter(m => m.status === 'Active').length;
    const expiringSoon = updatedMembers.filter(m => m.status === 'Expiring Soon').length;
    const expiredMembers = updatedMembers.filter(m => m.status === 'Expired').length;
    const refundedMembers = updatedMembers.filter(m => m.status === 'Refunded').length;
    const totalRevenue = updatedMembers.reduce((s, m) => s + m.totalPayment, 0);
    const totalPending = updatedMembers.reduce((s, m) => s + m.pendingPayment, 0);
    const totalRefund = updatedMembers.reduce((s, m) => s + m.refundAmount, 0);
    const totalCash = updatedMembers.reduce((s, m) => s + m.totalCash, 0);
    const totalUpi = updatedMembers.reduce((s, m) => s + m.totalUpi, 0);

    const monthlyTxns = await db.transaction.findMany({ where: { gymId: activeGymId, paymentDate: { gte: monthStart, lt: monthEnd } } });
    const monthlyRevenue = monthlyTxns.reduce((s, t) => s + t.amount, 0);
    const monthlyCash = monthlyTxns.filter(t => t.paymentMode === 'Cash').reduce((s, t) => s + t.amount, 0);
    const monthlyUpi = monthlyTxns.filter(t => t.paymentMode === 'UPI').reduce((s, t) => s + t.amount, 0);

    const monthlyExp = await db.expense.findMany({ where: { gymId: activeGymId, expenseDate: { gte: monthStart, lt: monthEnd } } });
    const monthlyExpenseTotal = monthlyExp.reduce((s, e) => s + e.cashAmount + e.upiAmount, 0);
    const monthlyCashExpense = monthlyExp.reduce((s, e) => s + e.cashAmount, 0);
    const monthlyUpiExpense = monthlyExp.reduce((s, e) => s + e.upiAmount, 0);

    const settings = await db.settings.findUnique({ where: { gymId: activeGymId } });
    const openingCash = settings?.openingCashBalance || 0;
    const openingUpi = settings?.openingUpiBalance || 0;
    const finalCashBalance = openingCash + totalCash - monthlyCashExpense;
    const finalUpiBalance = openingUpi + totalUpi - monthlyUpiExpense;
    const finalBalance = finalCashBalance + finalUpiBalance;

    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const mTxns = await db.transaction.findMany({ where: { gymId: activeGymId, paymentDate: { gte: d, lt: dEnd } } });
      const mExps = await db.expense.findMany({ where: { gymId: activeGymId, expenseDate: { gte: d, lt: dEnd } } });
      revenueByMonth.push({
        month: label,
        revenue: mTxns.reduce((s, t) => s + t.amount, 0),
        expenses: mExps.reduce((s, e) => s + e.cashAmount + e.upiAmount, 0),
      });
    }

    const recentTransactions = await db.transaction.findMany({
      where: { gymId: activeGymId },
      orderBy: { paymentDate: 'desc' },
      take: 10,
      include: { member: { select: { name: true, memberId: true } } },
    });

    return NextResponse.json({
      totalMembers, activeMembers, expiringSoon, expiredMembers, refundedMembers,
      totalRevenue, monthlyRevenue, monthlyCash, monthlyUpi,
      monthlyExpenses: monthlyExpenseTotal, monthlyCashExpense, monthlyUpiExpense,
      monthlyProfit: monthlyRevenue - monthlyExpenseTotal,
      totalCash, totalUpi, totalPending, totalRefund,
      openingCash, openingUpi, finalCashBalance, finalUpiBalance, finalBalance,
      revenueByMonth, recentTransactions,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
