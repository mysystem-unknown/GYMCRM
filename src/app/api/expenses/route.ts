import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET expenses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (month) {
      const startDate = new Date(`${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      where.expenseDate = { gte: startDate, lt: endDate };
    }
    if (category) where.category = category;

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.expense.count({ where }),
    ]);

    return NextResponse.json({ expenses, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('GET expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

// POST create expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, note, cashAmount, upiAmount, expenseDate } = body;

    const expense = await db.expense.create({
      data: {
        category: category || 'Other',
        note: note || '',
        cashAmount: cashAmount || 0,
        upiAmount: upiAmount || 0,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('POST expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

// DELETE expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE expense error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
