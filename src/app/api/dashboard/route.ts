import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 1);

    // Get all members
    const allMembers = await db.member.findMany({
      include: { transactions: true },
    });

    // Update statuses
    for (const member of allMembers) {
      if (member.status === 'Refunded') continue;
      const expiry = new Date(member.expiryDate);
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let newStatus = 'Expired';
      if (daysUntilExpiry > 7) newStatus = 'Active';
      else if (daysUntilExpiry > 0) newStatus = 'Expiring Soon';
      if (member.status !== newStatus) {
        await db.member.update({ where: { id: member.id }, data: { status: newStatus } });
        member.status = newStatus;
      }
    }

    // Refresh all members after status update
    const updatedMembers = await db.member.findMany();

    // Counts
    const totalMembers = updatedMembers.length;
    const activeMembers = updatedMembers.filter(m => m.status === 'Active').length;
    const expiringSoon = updatedMembers.filter(m => m.status === 'Expiring Soon').length;
    const expiredMembers = updatedMembers.filter(m => m.status === 'Expired').length;
    const refundedMembers = updatedMembers.filter(m => m.status === 'Refunded').length;

    // Totals
    const totalRevenue = updatedMembers.reduce((sum, m) => sum + m.totalPayment, 0);
    const totalPending = updatedMembers.reduce((sum, m) => sum + m.pendingPayment, 0);
    const totalRefund = updatedMembers.reduce((sum, m) => sum + m.refundAmount, 0);
    const totalCash = updatedMembers.reduce((sum, m) => sum + m.totalCash, 0);
    const totalUpi = updatedMembers.reduce((sum, m) => sum + m.totalUpi, 0);

    // Monthly data - transactions in current month
    const monthlyTransactions = await db.transaction.findMany({
      where: {
        paymentDate: { gte: monthStart, lt: monthEnd },
      },
    });
    const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyCash = monthlyTransactions.filter(t => t.paymentMode === 'Cash').reduce((sum, t) => sum + t.amount, 0);
    const monthlyUpi = monthlyTransactions.filter(t => t.paymentMode === 'UPI').reduce((sum, t) => sum + t.amount, 0);

    // Monthly expenses
    const monthlyExpenses = await db.expense.findMany({
      where: { expenseDate: { gte: monthStart, lt: monthEnd } },
    });
    const monthlyExpenseTotal = monthlyExpenses.reduce((sum, e) => sum + e.cashAmount + e.upiAmount, 0);
    const monthlyCashExpense = monthlyExpenses.reduce((sum, e) => sum + e.cashAmount, 0);
    const monthlyUpiExpense = monthlyExpenses.reduce((sum, e) => sum + e.upiAmount, 0);

    const monthlyProfit = monthlyRevenue - monthlyExpenseTotal;

    // Settings
    const settings = await db.settings.findUnique({ where: { id: 'main' } });
    const openingCash = settings?.openingCashBalance || 0;
    const openingUpi = settings?.openingUpiBalance || 0;

    const finalCashBalance = openingCash + totalCash - monthlyCashExpense;
    const finalUpiBalance = openingUpi + totalUpi - monthlyUpiExpense;
    const finalBalance = finalCashBalance + finalUpiBalance;

    // Revenue by month (last 6 months)
    const revenueByMonth: { month: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const dEnd = new Date(currentYear, currentMonth - i + 1, 1);
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const mTransactions = await db.transaction.findMany({
        where: { paymentDate: { gte: d, lt: dEnd } },
      });
      const mExpenses = await db.expense.findMany({
        where: { expenseDate: { gte: d, lt: dEnd } },
      });

      revenueByMonth.push({
        month: monthLabel,
        revenue: mTransactions.reduce((sum, t) => sum + t.amount, 0),
        expenses: mExpenses.reduce((sum, e) => sum + e.cashAmount + e.upiAmount, 0),
      });
    }

    // Recent transactions
    const recentTransactions = await db.transaction.findMany({
      orderBy: { paymentDate: 'desc' },
      take: 10,
      include: { member: { select: { name: true, memberId: true } } },
    });

    return NextResponse.json({
      totalMembers,
      activeMembers,
      expiringSoon,
      expiredMembers,
      refundedMembers,
      totalRevenue,
      monthlyRevenue,
      monthlyCash,
      monthlyUpi,
      monthlyExpenses: monthlyExpenseTotal,
      monthlyCashExpense,
      monthlyUpiExpense,
      monthlyProfit,
      totalCash,
      totalUpi,
      totalPending,
      totalRefund,
      openingCash,
      openingUpi,
      finalCashBalance,
      finalUpiBalance,
      finalBalance,
      revenueByMonth,
      recentTransactions,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
