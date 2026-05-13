import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET all gyms (super_admin only)
export async function GET() {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const gyms = await db.gym.findMany({
    include: {
      users: {
        where: { role: 'admin' },
        take: 1,
        select: { id: true, email: true, name: true, role: true },
      },
      _count: { select: { members: true, transactions: true, expenses: true, users: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ gyms });
}

// POST create gym + admin (super_admin only)
export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { gymName, gymSlug, gymAddress, gymPhone, adminEmail, adminPassword, adminName } = await request.json();

    if (!gymName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Gym name, admin email, and password are required' }, { status: 400 });
    }

    if (!adminEmail.includes('@') || !adminEmail.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    if (adminPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Auto-generate slug from gymName if not provided
    const slug = gymSlug || gymName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (!slug) {
      return NextResponse.json({ error: 'Could not generate gym slug from name' }, { status: 400 });
    }

    // Check slug uniqueness
    const existingGym = await db.gym.findUnique({ where: { slug } });
    if (existingGym) {
      return NextResponse.json({ error: 'Gym slug already exists' }, { status: 400 });
    }

    // Check email uniqueness
    const existingUser = await db.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create gym
    const gym = await db.gym.create({
      data: {
        name: gymName,
        slug,
        address: gymAddress || '',
        phone: gymPhone || '',
      },
    });

    // Create admin user with gymId
    const admin = await db.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName || gymName + ' Admin',
        role: 'admin',
        gymId: gym.id,
      },
    });

    // Create settings
    await db.settings.create({
      data: { gymId: gym.id, openingCashBalance: 0, openingUpiBalance: 0 },
    });

    return NextResponse.json({ success: true, gym, admin: { id: admin.id, email: admin.email, name: admin.name } }, { status: 201 });
  } catch (err) {
    console.error('Create gym error:', err);
    return NextResponse.json({ error: 'Failed to create gym' }, { status: 500 });
  }
}

// PATCH toggle gym active status (super_admin only)
export async function PATCH(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { id, isActive } = await request.json();
    if (!id) return NextResponse.json({ error: 'Gym ID required' }, { status: 400 });

    const gym = await db.gym.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({ success: true, gym });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update gym' }, { status: 500 });
  }
}

// DELETE gym (super_admin only)
export async function DELETE(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;
  if (user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Gym ID required' }, { status: 400 });

    // Delete all users for the gym
    await db.user.deleteMany({ where: { gymId: id } });
    await db.gym.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete gym' }, { status: 500 });
  }
}
