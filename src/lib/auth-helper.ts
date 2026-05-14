import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

export async function requireGymAccess() {
  const { error, session } = await requireAuth();
  if (error) return { error, session: null, gymId: null };
  if (!session.user.gymId) {
    return { error: NextResponse.json({ error: 'No gym assigned' }, { status: 403 }), session, gymId: null };
  }
  return { error: null, session, gymId: session.user.gymId };
}

export async function requireSuperAdmin() {
  const { error, session } = await requireAuth();
  if (error) return { error, session: null };
  if (session.user.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
