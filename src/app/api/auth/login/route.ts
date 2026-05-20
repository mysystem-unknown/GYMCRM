import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    console.log('[Login API] Attempt for:', email);

    if (!email || !password) {
      console.log('[Login API] Missing email or password');
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { gym: true },
    });

    if (!user) {
      console.log('[Login API] User not found:', email);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      console.log('[Login API] Account inactive:', email);
      return NextResponse.json({ error: 'Account is deactivated. Contact admin.' }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log('[Login API] Invalid password for:', email);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      gymId: user.gymId || null,
      gymName: user.gym?.name || null,
      gymSlug: user.gym?.slug || null,
      canRenewMemberships: user.canRenewMemberships || false,
    };

    const token = await createSession(authUser);
    console.log('[Login API] JWT created, token length:', token.length);

    const response = NextResponse.json({
      success: true,
      user: authUser,
    });
    setSessionCookie(response, token);

    // Verify cookie was set
    const cookieHeader = response.headers.get('set-cookie');
    console.log('[Login API] Set-Cookie header present:', !!cookieHeader);
    console.log('[Login API] Cookie name in header:', cookieHeader?.substring(0, 30));

    console.log('[Login API] Success:', user.email, user.role);
    return response;
  } catch (error) {
    console.error('[Login API] Error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
