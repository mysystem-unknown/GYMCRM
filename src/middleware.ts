import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Auth is handled client-side via NextAuth JWT
  // All routes are public - client-side AuthGate handles protection
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
