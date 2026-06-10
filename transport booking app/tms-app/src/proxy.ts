import { NextResponse, type NextRequest } from 'next/server';

// Role-based auth is handled client-side via localStorage + AppShell.
// This proxy just passes all requests through.
export function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
