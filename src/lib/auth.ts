import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as any;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null };
  }
  return { error: null, user };
}

export async function requireGymAccess(gymId?: string) {
  const { error: authError, user } = await requireAuth();
  if (authError) return { error: authError, user: null, activeGymId: null };

  // Super admin can access any gym or no gym (to create gyms)
  if (user.role === 'super_admin') {
    const activeGymId = gymId || user.gymId || null;
    return { error: null, user, activeGymId };
  }

  // Admin/staff must have a gym
  if (!user.gymId) {
    return { error: NextResponse.json({ error: 'No gym assigned' }, { status: 403 }), user, activeGymId: null };
  }

  // Admin/staff can only access their own gym
  if (gymId && gymId !== user.gymId) {
    return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }), user, activeGymId: null };
  }

  return { error: null, user, activeGymId: user.gymId };
}
