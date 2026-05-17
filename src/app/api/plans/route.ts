import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireGymAccess } from '@/lib/auth';

// GET - List plans for a gym
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId') || undefined;
    const { error, activeGymId } = await requireGymAccess(gymId);
    if (error) return error;

    const targetGymId = activeGymId;
    if (!targetGymId) {
      return NextResponse.json({ plans: [] });
    }

    const plans = await db.gymPlan.findMany({
      where: { gymId: targetGymId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('GET plans error:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

// POST - Create a new plan
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Staff cannot create plans' }, { status: 403 });
    }

    const body = await request.json();
    const { gymId: reqGymId, name, durationDays, price, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }
    if (!durationDays || durationDays < 1) {
      return NextResponse.json({ error: 'Duration must be at least 1 day' }, { status: 400 });
    }
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 400 });
    }

    const targetGymId = user.role === 'super_admin' ? reqGymId : user.gymId;
    if (!targetGymId) {
      return NextResponse.json({ error: 'No gym specified' }, { status: 400 });
    }

    const existing = await db.gymPlan.findFirst({
      where: { gymId: targetGymId, name: name.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'A plan with this name already exists in this gym' }, { status: 400 });
    }

    const plan = await db.gymPlan.create({
      data: {
        gymId: targetGymId,
        name: name.trim(),
        durationDays,
        price: Math.round(price * 100) / 100,
        description: (description || '').trim(),
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('POST plan error:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

// PATCH - Update a plan
export async function PATCH(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Staff cannot update plans' }, { status: 403 });
    }

    const { id, name, durationDays, price, description, isActive } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const existing = await db.gymPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (user.role !== 'super_admin' && existing.gymId !== user.gymId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (name && name.trim() !== existing.name) {
      const dup = await db.gymPlan.findFirst({
        where: { gymId: existing.gymId, name: name.trim() },
      });
      if (dup) {
        return NextResponse.json({ error: 'A plan with this name already exists in this gym' }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (durationDays !== undefined) {
      if (durationDays < 1) return NextResponse.json({ error: 'Duration must be at least 1 day' }, { status: 400 });
      data.durationDays = durationDays;
    }
    if (price !== undefined) {
      if (price < 0) return NextResponse.json({ error: 'Price must be non-negative' }, { status: 400 });
      data.price = Math.round(price * 100) / 100;
    }
    if (description !== undefined) data.description = description.trim();
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await db.gymPlan.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH plan error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

// DELETE - Delete a plan (only if no members are using it)
export async function DELETE(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Staff cannot delete plans' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const plan = await db.gymPlan.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (user.role !== 'super_admin' && plan.gymId !== user.gymId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const memberCount = plan._count.members;
    if (memberCount > 0) {
      return NextResponse.json({
        error: `Cannot delete plan "${plan.name}" - ${memberCount} member(s) are using this plan. Deactivate it instead.`,
      }, { status: 400 });
    }

    await db.gymPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE plan error:', error);
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
