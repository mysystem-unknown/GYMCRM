import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireGymAccess } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId') || undefined;
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const { error, activeGymId } = await requireGymAccess(gymId);
    if (error) return error;
    if (!activeGymId) return NextResponse.json({ expenses: [], total: 0, page: 1, totalPages: 0 });

    const where: Record<string, unknown> = { gymId: activeGymId };
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gymId: reqGymId, category, note, cashAmount, upiAmount, expenseDate } = body;

    const { error, activeGymId } = await requireGymAccess(reqGymId);
    if (error) return error;
    if (!activeGymId) return NextResponse.json({ error: 'No gym selected. Please select a gym first.' }, { status: 400 });

    if (!category || !category.trim()) {
      return NextResponse.json({ error: 'Expense category is required' }, { status: 400 });
    }

    const cash = typeof cashAmount === 'number' ? cashAmount : 0;
    const upi = typeof upiAmount === 'number' ? upiAmount : 0;

    if (cash < 0) {
      return NextResponse.json({ error: 'Cash amount cannot be negative' }, { status: 400 });
    }
    if (upi < 0) {
      return NextResponse.json({ error: 'UPI amount cannot be negative' }, { status: 400 });
    }
    if (cash === 0 && upi === 0) {
      return NextResponse.json({ error: 'At least one amount (cash or UPI) must be greater than 0' }, { status: 400 });
    }

    const expense = await db.expense.create({
      data: {
        gymId: activeGymId,
        category: category.trim(),
        note: (note || '').trim(),
        cashAmount: cash,
        upiAmount: upi,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('POST expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE expense error:', error);
    if (error instanceof Error && error.message.includes('Record to delete not found')) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
