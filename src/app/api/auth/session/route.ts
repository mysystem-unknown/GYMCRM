import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(null)
  }
  return NextResponse.json({
    id: (session.user as any).id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user as any).role,
    gymId: (session.user as any).gymId,
    gymName: (session.user as any).gymName,
    gymSlug: (session.user as any).gymSlug,
    canRenewMemberships: (session.user as any).canRenewMemberships || false,
  })
}
