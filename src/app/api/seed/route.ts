import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

const SUPER_ADMIN_EMAIL = '0110aryantiwari@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Aryan@121';
const SUPER_ADMIN_NAME = 'Aryan Tiwari';

// GET - Auto-ensure super admin exists with correct password
// Called by auth-gate on every page load to guarantee login works
export async function GET() {
  try {
    const existing = await db.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });

    if (existing) {
      // Verify password matches — fix if broken
      const match = await bcrypt.compare(SUPER_ADMIN_PASSWORD, existing.password);
      if (!match) {
        const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
        await db.user.update({
          where: { email: SUPER_ADMIN_EMAIL },
          data: { password: hashedPassword, role: 'super_admin', isActive: true },
        });
      }
    } else {
      // Create super admin if missing
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
      await db.user.create({
        data: {
          email: SUPER_ADMIN_EMAIL,
          password: hashedPassword,
          name: SUPER_ADMIN_NAME,
          role: 'super_admin',
          isActive: true,
        },
      });
    }

    const userCount = await db.user.count();
    return NextResponse.json({ isInitialized: userCount > 0 });
  } catch (error) {
    console.error('Seed GET error:', error);
    return NextResponse.json({ isInitialized: false });
  }
}

// POST - Force reset super admin password
export async function POST() {
  try {
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
    const existing = await db.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });

    if (existing) {
      await db.user.update({
        where: { email: SUPER_ADMIN_EMAIL },
        data: { password: hashedPassword },
      });
      return NextResponse.json({ success: true, message: 'Super admin password reset' });
    }

    await db.user.create({
      data: {
        email: SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        name: SUPER_ADMIN_NAME,
        role: 'super_admin',
        isActive: true,
      },
    });
    return NextResponse.json({ success: true, message: 'Super admin created' });
  } catch (error) {
    console.error('Seed POST error:', error);
    return NextResponse.json({ error: 'Failed to seed' }, { status: 500 });
  }
}
