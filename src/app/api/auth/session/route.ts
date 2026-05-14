import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    console.log('[Session API] No valid session found');
    return NextResponse.json(null);
  }
  console.log('[Session API] Valid session:', user.email, user.role);
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    gymId: user.gymId,
    gymName: user.gymName,
    gymSlug: user.gymSlug,
    canRenewMemberships: user.canRenewMemberships,
  });
}
