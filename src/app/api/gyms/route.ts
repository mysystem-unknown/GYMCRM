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
      owner: { select: { id: true, email: true, name: true, role: true } },
      _count: { select: { members: true } },
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

    if (!gymName || !gymSlug || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Gym name, slug, admin email, and password are required' }, { status: 400 });
    }

    // Check slug uniqueness
    const existingGym = await db.gym.findUnique({ where: { slug: gymSlug } });
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
        slug: gymSlug,
        address: gymAddress || '',
        phone: gymPhone || '',
      },
    });

    // Create admin user
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

    // Unassign owner first
    await db.user.updateMany({ where: { gymId: id }, data: { gymId: null } });
    await db.gym.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete gym' }, { status: 500 });
  }
}
