import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(null);
  }
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
