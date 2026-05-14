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

    // Bulk status update for all non-refunded members
    const membersNeedingUpdate = await db.member.findMany({
      where: {
        gymId: activeGymId,
        status: { not: 'Refunded' },
      },
    });

    const updates = membersNeedingUpdate.map(member => {
      const expiry = new Date(member.expiryDate);
      const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let newStatus = 'Expired';
      if (days > 7) newStatus = 'Active';
      else if (days > 0) newStatus = 'Expiring Soon';
      if (member.status !== newStatus) {
        return { id: member.id, status: newStatus };
      }
      return null;
    }).filter(Boolean) as { id: string; status: string }[];

    if (updates.length > 0) {
      await Promise.all(
        updates.map(u => db.member.update({ where: { id: u.id }, data: { status: u.status } }))
      );
    }

    // Member counts
    const [totalMembers, activeMembers, expiringSoon, expiredMembers, refundedMembers] = await Promise.all([
      db.member.count({ where: { gymId: activeGymId } }),
      db.member.count({ where: { gymId: activeGymId, status: 'Active' } }),
      db.member.count({ where: { gymId: activeGymId, status: 'Expiring Soon' } }),
      db.member.count({ where: { gymId: activeGymId, status: 'Expired' } }),
      db.member.count({ where: { gymId: activeGymId, status: 'Refunded' } }),
    ]);

    // Member payment aggregates (all-time)
    const aggregateResult = await db.member.aggregate({
      where: { gymId: activeGymId },
      _sum: {
        totalPayment: true,
        totalCash: true,
        totalUpi: true,
        pendingPayment: true,
        refundAmount: true,
      },
    });
    const sum = aggregateResult._sum;

    const totalRevenue = sum.totalPayment || 0;
    const totalCash = sum.totalCash || 0;
    const totalUpi = sum.totalUpi || 0;
    const totalPending = sum.pendingPayment || 0;
    const totalRefund = sum.refundAmount || 0;

    // Monthly transaction aggregations
    const monthlyTxnAggregate = await db.transaction.aggregate({
      where: { gymId: activeGymId, paymentDate: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    });
    const monthlyRevenue = monthlyTxnAggregate._sum.amount || 0;

    const monthlyCashAggregate = await db.transaction.aggregate({
      where: { gymId: activeGymId, paymentDate: { gte: monthStart, lt: monthEnd }, paymentMode: 'Cash' },
      _sum: { amount: true },
    });
    const monthlyCash = monthlyCashAggregate._sum.amount || 0;

    const monthlyUpiAggregate = await db.transaction.aggregate({
      where: { gymId: activeGymId, paymentDate: { gte: monthStart, lt: monthEnd }, paymentMode: 'UPI' },
      _sum: { amount: true },
    });
    const monthlyUpi = monthlyUpiAggregate._sum.amount || 0;

    // Monthly expense aggregations
    const monthlyExpAggregate = await db.expense.aggregate({
      where: { gymId: activeGymId, expenseDate: { gte: monthStart, lt: monthEnd } },
      _sum: { cashAmount: true, upiAmount: true },
    });
    const monthlyExpenseTotal = (monthlyExpAggregate._sum.cashAmount || 0) + (monthlyExpAggregate._sum.upiAmount || 0);
    const monthlyCashExpense = monthlyExpAggregate._sum.cashAmount || 0;
    const monthlyUpiExpense = monthlyExpAggregate._sum.upiAmount || 0;

    // Total (all-time) expense aggregations for correct balance calculation
    const totalExpAggregate = await db.expense.aggregate({
      where: { gymId: activeGymId },
      _sum: { cashAmount: true, upiAmount: true },
    });
    const totalCashExpense = totalExpAggregate._sum.cashAmount || 0;
    const totalUpiExpense = totalExpAggregate._sum.upiAmount || 0;

    // Balance calculations
    // Cash Balance = Opening Cash + Total Cash Revenue (all-time) - Total Cash Expenses (all-time)
    // UPI Balance = Opening UPI + Total UPI Revenue (all-time) - Total UPI Expenses (all-time)
    const settings = await db.settings.findUnique({ where: { gymId: activeGymId } });
    const openingCash = settings?.openingCashBalance || 0;
    const openingUpi = settings?.openingUpiBalance || 0;
    const finalCashBalance = openingCash + totalCash - totalCashExpense;
    const finalUpiBalance = openingUpi + totalUpi - totalUpiExpense;
    const finalBalance = finalCashBalance + finalUpiBalance;

    // Revenue by month
    const revenueByMonth: { month: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const [txnAgg, expAgg] = await Promise.all([
        db.transaction.aggregate({
          where: { gymId: activeGymId, paymentDate: { gte: d, lt: dEnd } },
          _sum: { amount: true },
        }),
        db.expense.aggregate({
          where: { gymId: activeGymId, expenseDate: { gte: d, lt: dEnd } },
          _sum: { cashAmount: true, upiAmount: true },
        }),
      ]);

      revenueByMonth.push({
        month: label,
        revenue: txnAgg._sum.amount || 0,
        expenses: (expAgg._sum.cashAmount || 0) + (expAgg._sum.upiAmount || 0),
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
