import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    // Check if already initialized
    const existingUsers = await db.user.count();
    if (existingUsers > 0) {
      return NextResponse.json({ success: true, message: 'Already initialized' });
    }

    const hashedPassword = await bcrypt.hash('Aryan@121', 12);

    // Create super admin
    const superAdmin = await db.user.create({
      data: {
        email: '0110aryantiwari@gmail.com',
        password: hashedPassword,
        name: 'Aryan Tiwari',
        role: 'super_admin',
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Super admin created',
      email: '0110aryantiwari@gmail.com',
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to create super admin' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userCount = await db.user.count();
    return NextResponse.json({ isInitialized: userCount > 0 });
  } catch (error) {
    return NextResponse.json({ isInitialized: false });
  }
}
