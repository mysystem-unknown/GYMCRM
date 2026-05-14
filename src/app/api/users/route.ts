import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireGymAccess } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// GET users for a gym
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gymId') || undefined

    const { error, user } = await requireAuth()
    if (error) return error

    if (user.role === 'super_admin') {
      const targetGymId = gymId || user.gymId
      if (!targetGymId) {
        // Super admin with no gymId - return all users
        const users = await db.user.findMany({
          where: { role: { not: 'super_admin' } },
          select: { id: true, email: true, name: true, role: true, isActive: true, gymId: true, canRenewMemberships: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json({ users })
      }
      const users = await db.user.findMany({
        where: { gymId: targetGymId, role: { not: 'super_admin' } },
        select: { id: true, email: true, name: true, role: true, isActive: true, gymId: true, canRenewMemberships: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ users })
    }

    // Admin can see their own gym's users
    if (!user.gymId) return NextResponse.json({ users: [] })
    const users = await db.user.findMany({
      where: { gymId: user.gymId, role: { not: 'super_admin' } },
      select: { id: true, email: true, name: true, role: true, isActive: true, gymId: true, canRenewMemberships: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ users })
  } catch (error) {
    console.error('GET users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST create staff user
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth()
    if (error) return error
    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Staff cannot create users' }, { status: 403 })
    }

    const { email, name, password, role, gymId: targetGymId, canRenewMemberships } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    // Determine which gym
    const assignedGymId = user.role === 'super_admin' ? targetGymId : user.gymId
    if (!assignedGymId && role !== 'super_admin') {
      return NextResponse.json({ error: 'No gym specified' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role: role || 'staff',
        gymId: assignedGymId || null,
        canRenewMemberships: canRenewMemberships || false,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, gymId: true, canRenewMemberships: true },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('POST user error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

// PATCH update user
export async function PATCH(request: NextRequest) {
  try {
    const { error, user } = await requireAuth()
    if (error) return error
    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Staff cannot update users' }, { status: 403 })
    }

    const { id, name, role, isActive, canRenewMemberships } = await request.json()
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    // Check target user exists and is in the same gym (or super admin)
    const targetUser = await db.user.findUnique({ where: { id } })
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (user.role !== 'super_admin' && targetUser.gymId !== user.gymId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Prevent modifying super admin
    if (targetUser.role === 'super_admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Cannot modify super admin' }, { status: 403 })
    }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (role !== undefined) data.role = role
    if (isActive !== undefined) data.isActive = isActive
    if (canRenewMemberships !== undefined) data.canRenewMemberships = canRenewMemberships

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, gymId: true, canRenewMemberships: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH user error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE staff user
export async function DELETE(request: NextRequest) {
  try {
    const { error, user } = await requireAuth()
    if (error) return error
    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Staff cannot delete users' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    const targetUser = await db.user.findUnique({ where: { id } })
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (targetUser.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot delete super admin' }, { status: 403 })
    }
    if (user.role !== 'super_admin' && targetUser.gymId !== user.gymId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await db.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE user error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
