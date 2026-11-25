import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
export async function middleware(req) {
  const p = req.nextUrl.pathname;
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (p.startsWith('/api') && mutating) {
    const origin = req.headers.get('origin');
    if (!origin || origin !== req.nextUrl.origin) {
      const denied = NextResponse.json({ error: 'Permintaan lintas situs ditolak' }, { status: 403 });
      denied.headers.set('Cache-Control', 'no-store');
      return denied;
    }
  }
  const t = req.cookies.get('token')?.value;
  let ok = false;
  if (t) {
    try {
      const secret = process.env.JWT_SECRET;
      if (secret && new TextEncoder().encode(secret).length >= 32) {
        await jwtVerify(t, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
        ok = true;
      }
    } catch {}
  }
  if (!ok && p !== '/login' && p !== '/api/login') {
    if (p.startsWith('/api')) {
      const denied = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      denied.headers.set('Cache-Control', 'no-store');
      return denied;
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
  const response = NextResponse.next();
  if (p.startsWith('/api')) response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };
