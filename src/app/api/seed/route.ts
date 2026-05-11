import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Seed settings
    await db.settings.upsert({
      where: { id: 'main' },
      update: {},
      create: {
        id: 'main',
        openingCashBalance: 5000,
        openingUpiBalance: 2000,
      },
    });

    // Seed sample members from the Excel data
    const members = [
      { memberId: 'GYM-001', name: 'Rahul', phoneNumber: '1234567899', joinDate: '2026-06-14', expiryDate: '2026-07-14', plan: '1 Month', months: 1, price: 1500, cash: 0, upi: 4500, total: 4500, totalCash: 0, totalUpi: 4500, pending: 0, refund: 0, status: 'Active', notes: '' },
      { memberId: 'GYM-002', name: 'Muke', phoneNumber: '9999999999', joinDate: '2026-04-12', expiryDate: '2026-05-12', plan: '1 Month', months: 1, price: 1500, cash: 0, upi: 1500, total: 1500, totalCash: 0, totalUpi: 1500, pending: 0, refund: 0, status: 'Active', notes: '' },
      { memberId: 'GYM-003', name: 'Prabhu', phoneNumber: '1234567890', joinDate: '2026-05-05', expiryDate: '2026-11-05', plan: '6 Months', months: 6, price: 4500, cash: 0, upi: 1500, total: 1500, totalCash: 0, totalUpi: 1500, pending: 0, refund: 0, status: 'Active', notes: '' },
      { memberId: 'GYM-004', name: 'Oush', phoneNumber: '1212121212', joinDate: '2026-05-09', expiryDate: '2026-08-09', plan: '3 Months', months: 3, price: 3500, cash: 0, upi: 3500, total: 3500, totalCash: 0, totalUpi: 3500, pending: 0, refund: 0, status: 'Active', notes: '' },
      { memberId: 'GYM-005', name: 'Arun', phoneNumber: '9876543210', joinDate: '2026-04-01', expiryDate: '2026-05-01', plan: '1 Month', months: 1, price: 1500, cash: 1500, upi: 0, total: 1500, totalCash: 1500, totalUpi: 0, pending: 0, refund: 0, status: 'Expired', notes: '' },
      { memberId: 'GYM-006', name: 'Vikram', phoneNumber: '9988776655', joinDate: '2026-05-01', expiryDate: '2026-06-01', plan: '1 Month', months: 1, price: 1500, cash: 0, upi: 1500, total: 1500, totalCash: 0, totalUpi: 1500, pending: 0, refund: 0, status: 'Active', notes: '' },
      { memberId: 'GYM-007', name: 'Deepak', phoneNumber: '8877665544', joinDate: '2026-04-15', expiryDate: '2026-05-15', plan: '3 Months', months: 3, price: 3500, cash: 2000, upi: 1500, total: 3500, totalCash: 2000, totalUpi: 1500, pending: 0, refund: 0, status: 'Active', notes: '' },
      { memberId: 'GYM-008', name: 'Suresh', phoneNumber: '7766554433', joinDate: '2026-03-10', expiryDate: '2026-04-10', plan: '1 Month', months: 1, price: 1500, cash: 0, upi: 1500, total: 1500, totalCash: 0, totalUpi: 1500, pending: 500, refund: 0, status: 'Expired', notes: '' },
      { memberId: 'GYM-009', name: 'Ramesh', phoneNumber: '6655443322', joinDate: '2026-05-10', expiryDate: '2026-11-10', plan: '6 Months', months: 6, price: 4500, cash: 4500, upi: 0, total: 4500, totalCash: 4500, totalUpi: 0, pending: 0, refund: 0, status: 'Active', notes: '' },
      { memberId: 'GYM-010', name: 'Kumar', phoneNumber: '5544332211', joinDate: '2026-05-08', expiryDate: '2026-06-08', plan: '1 Month', months: 1, price: 1500, cash: 0, upi: 1500, total: 1500, totalCash: 0, totalUpi: 1500, pending: 0, refund: 500, status: 'Refunded', notes: 'Refunded due to medical reason' },
      { memberId: 'GYM-011', name: 'Sanjay', phoneNumber: '4433221100', joinDate: '2026-05-02', expiryDate: '2026-05-17', plan: '1 Month', months: 1, price: 1500, cash: 1500, upi: 0, total: 1500, totalCash: 1500, totalUpi: 0, pending: 0, refund: 0, status: 'Active', notes: '' },
      { memberId: 'GYM-012', name: 'Manoj', phoneNumber: '3322110099', joinDate: '2026-04-20', expiryDate: '2026-05-20', plan: '1 Month', months: 1, price: 1500, cash: 1000, upi: 0, total: 1000, totalCash: 1000, totalUpi: 0, pending: 0, refund: 0, status: 'Active', notes: '' },
    ];

    for (const m of members) {
      const existing = await db.member.findUnique({ where: { memberId: m.memberId } });
      if (!existing) {
        await db.member.create({
          data: {
            memberId: m.memberId,
            name: m.name,
            phoneNumber: m.phoneNumber,
            joinDate: new Date(m.joinDate),
            expiryDate: new Date(m.expiryDate),
            membershipPlan: m.plan,
            durationMonths: m.months,
            planPrice: m.price,
            currentCashPayment: m.cash,
            currentUpiPayment: m.upi,
            totalPayment: m.total,
            totalCash: m.totalCash,
            totalUpi: m.totalUpi,
            pendingPayment: m.pending,
            refundAmount: m.refund,
            status: m.status,
            notes: m.notes,
          },
        });
      }
    }

    // Seed transactions from the members
    for (const m of members) {
      if (m.total > 0) {
        const existing = await db.transaction.findFirst({
          where: { member: { memberId: m.memberId } },
        });
        if (!existing) {
          await db.transaction.create({
            data: {
              memberId: (await db.member.findUnique({ where: { memberId: m.memberId } }))!.id,
              paymentMode: m.cash > 0 ? 'Cash' : 'UPI',
              amount: m.total,
              plan: m.plan,
              duration: m.months,
              paymentDate: new Date(m.joinDate),
            },
          });
        }
      }
    }

    // Seed expenses
    const existingExpenses = await db.expense.count();
    if (existingExpenses === 0) {
      await db.expense.createMany({
        data: [
          { category: 'Salary', note: 'Trainer', cashAmount: 8000, upiAmount: 0, expenseDate: new Date('2026-05-01') },
          { category: 'Breakfast', note: 'Member breakfast', cashAmount: 0, upiAmount: 500, expenseDate: new Date('2026-05-01') },
        ],
      });
    }

    // Update member statuses based on current date
    const allMembers = await db.member.findMany();
    const now = new Date();
    for (const member of allMembers) {
      if (member.status === 'Refunded') continue;
      const expiry = new Date(member.expiryDate);
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let newStatus = 'Expired';
      if (daysUntilExpiry > 7) newStatus = 'Active';
      else if (daysUntilExpiry > 0) newStatus = 'Expiring Soon';
      await db.member.update({ where: { id: member.id }, data: { status: newStatus } });
    }

    return NextResponse.json({ success: true, message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}
