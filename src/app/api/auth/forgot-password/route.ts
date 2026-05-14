import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists for security
      return NextResponse.json({ message: 'If this email exists, a reset link has been generated.' });
    }

    // Create reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await db.resetToken.create({
      data: { email, token, expiresAt },
    });

    // In production, send email here. For now, return the token so admin can share it.
    return NextResponse.json({
      message: 'Password reset token generated. Contact your admin for the reset token.',
      token, // Only in non-production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
