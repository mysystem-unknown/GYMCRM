import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireGymAccess } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId') || undefined;
    const format = searchParams.get('format') || 'json';

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

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();

      // Members sheet
      const membersData = members.map(m => ({
        'Member ID': m.memberId, 'Name': m.name, 'Phone': m.phoneNumber,
        'Join Date': new Date(m.joinDate).toLocaleDateString('en-IN'),
        'Expiry Date': new Date(m.expiryDate).toLocaleDateString('en-IN'),
        'Plan': m.membershipPlan, 'Duration (Months)': m.durationMonths,
        'Plan Price': m.planPrice, 'Cash Payment': m.currentCashPayment,
        'UPI Payment': m.currentUpiPayment, 'Total Payment': m.totalPayment,
        'Total Cash': m.totalCash, 'Total UPI': m.totalUpi,
        'Pending': m.pendingPayment, 'Refund': m.refundAmount,
        'Status': m.status, 'Notes': m.notes,
      }));
      const ws1 = XLSX.utils.json_to_sheet(membersData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Members');

      // Transactions sheet
      const txData = transactions.map(t => ({
        'Member ID': t.member?.memberId || '', 'Member Name': t.member?.name || '',
        'Payment Mode': t.paymentMode, 'Amount': t.amount,
        'Plan': t.plan, 'Duration (Months)': t.duration,
        'Payment Date': new Date(t.paymentDate).toLocaleDateString('en-IN'),
      }));
      const ws2 = XLSX.utils.json_to_sheet(txData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Transactions');

      // Expenses sheet
      const expData = expenses.map(e => ({
        'Category': e.category, 'Note': e.note,
        'Cash Amount': e.cashAmount, 'UPI Amount': e.upiAmount,
        'Total': e.cashAmount + e.upiAmount,
        'Expense Date': new Date(e.expenseDate).toLocaleDateString('en-IN'),
      }));
      const ws3 = XLSX.utils.json_to_sheet(expData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Expenses');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="gymcrm-backup-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        },
      });
    }

    // JSON format (default)
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
