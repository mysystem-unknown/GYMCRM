import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode('gymcrm-local-jwt-secret-2024-no-env-needed');
const COOKIE_NAME = 'gymcrm-session';
const JWT_MAX_AGE = '24h';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  gymId: string | null;
  gymName: string | null;
  gymSlug: string | null;
  canRenewMemberships: boolean;
}

/** Create a JWT session token for a user */
export async function createSession(user: AuthUser): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    gymId: user.gymId,
    gymName: user.gymName,
    gymSlug: user.gymSlug,
    canRenewMemberships: user.canRenewMemberships,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_MAX_AGE)
    .sign(JWT_SECRET);
  return token;
}

/** Verify a JWT token and return the payload */
async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: (payload.name as string) || null,
      role: payload.role as string,
      gymId: (payload.gymId as string) || null,
      gymName: (payload.gymName as string) || null,
      gymSlug: (payload.gymSlug as string) || null,
      canRenewMemberships: (payload.canRenewMemberships as boolean) || false,
    };
  } catch {
    return null;
  }
}

/** Get the current authenticated user from cookies */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Require authentication - returns error response or authenticated user */
export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null };
  }
  return { error: null, user };
}

/** Require gym access - checks user has access to the specified gym */
export async function requireGymAccess(gymId?: string) {
  const { error, user } = await requireAuth();
  if (error) return { error, user: null, activeGymId: null };

  if (user.role === 'super_admin') {
    const activeGymId = gymId || user.gymId || null;
    return { error: null, user, activeGymId };
  }

  if (!user.gymId) {
    return { error: NextResponse.json({ error: 'No gym assigned' }, { status: 403 }), user, activeGymId: null };
  }

  if (gymId && gymId !== user.gymId) {
    return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }), user, activeGymId: null };
  }

  return { error: null, user, activeGymId: user.gymId };
}

/** Require owner or admin role */
export async function requireOwnerOrAdmin() {
  const { error, user } = await requireAuth();
  if (error) return { error, user: null };
  if (user.role === 'staff') {
    return { error: NextResponse.json({ error: 'Staff cannot perform this action' }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

/** Check if a user can renew memberships */
export function canRenewMember(user: AuthUser): boolean {
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  if (user.role === 'staff') return user.canRenewMemberships === true;
  return false;
}

/** Delete session cookie */
export function deleteSessionCookie() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/** Set session cookie on a response */
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return response;
}

export { COOKIE_NAME };
