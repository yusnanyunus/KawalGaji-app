import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { sign } from '@/lib/auth';
export async function POST(req) {
  const length = Number(req.headers.get('content-length') || 0);
  if (length > 8192) return NextResponse.json({ error: 'Permintaan terlalu besar' }, { status: 413 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 400 }); }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password || email.length > 150 || password.length > 256)
    return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
  const { data: allowed, error: limitError } = await db.rpc('check_login_rate_limit', { p_email: email });
  if (limitError) {
    console.error('Login rate limit check failed:', {
      code: limitError.code || null,
      message: limitError.message || String(limitError),
      cause: limitError.cause?.message || null,
      status: limitError.status || null
    });
    return NextResponse.json({ error: 'Layanan login sementara tidak tersedia' }, { status: 503 });
  }
  if (!allowed) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }, { status: 429 });
  const { data: u } = await db.from('users').select('oid,fullname,status,password').eq('email', email).is('deleted_at', null).maybeSingle();
  if (!u || u.status !== 'active' || !(await bcrypt.compare(password, u.password))) {
    const { error } = await db.rpc('record_login_failure', { p_email: email });
    if (error) {
      console.error('Login failure record failed:', error.code);
      return NextResponse.json({ error: 'Layanan login sementara tidak tersedia' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
  }
  const { error: clearError } = await db.rpc('clear_login_failures', { p_email: email });
  if (clearError) console.error('Login failure reset failed:', clearError.code);
  const res = NextResponse.json({ ok: true, fullname: u.fullname });
  res.cookies.set('token', await sign({ oid: u.oid, fullname: u.fullname }), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 43200
  });
  return res;
}
