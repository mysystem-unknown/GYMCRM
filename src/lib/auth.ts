import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

interface AuthUser {
  id: string
  email: string
  name: string | null
  role: string
  gymId: string | null
  gymName: string | null
  gymSlug: string | null
  canRenewMemberships: boolean
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session.user as unknown as AuthUser
}

export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null }
  }
  return { error: null, user }
}

export async function requireGymAccess(gymId?: string) {
  const { error, user } = await requireAuth()
  if (error) return { error, user: null, activeGymId: null }

  if (user.role === 'super_admin') {
    const activeGymId = gymId || user.gymId || null
    return { error: null, user, activeGymId }
  }

  if (!user.gymId) {
    return { error: NextResponse.json({ error: 'No gym assigned' }, { status: 403 }), user, activeGymId: null }
  }

  if (gymId && gymId !== user.gymId) {
    return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }), user, activeGymId: null }
  }

  return { error: null, user, activeGymId: user.gymId }
}

export async function requireOwnerOrAdmin() {
  const { error, user } = await requireAuth()
  if (error) return { error, user: null }
  if (user.role === 'staff') {
    return { error: NextResponse.json({ error: 'Staff cannot perform this action' }, { status: 403 }), user: null }
  }
  return { error: null, user }
}

export async function canRenewMember(user: AuthUser) {
  // Super admin and admin can always renew
  if (user.role === 'super_admin' || user.role === 'admin') return true
  // Staff can only renew if explicitly permitted
  if (user.role === 'staff') return user.canRenewMemberships === true
  return false
}
