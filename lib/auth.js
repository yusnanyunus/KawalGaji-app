import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
const key = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) throw new Error('JWT_SECRET must be at least 32 bytes');
  return new TextEncoder().encode(secret);
};
export const sign = (p) => new SignJWT(p).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('12h').sign(key());
export async function session() {
  const t = (await cookies()).get('token')?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key(), { algorithms: ['HS256'] });
    if (!payload.oid) return null;
    const { data: user, error } = await db.from('users').select('oid,fullname,status,role').eq('oid', payload.oid).is('deleted_at', null).maybeSingle();
    if (error) {
      console.error('Session user lookup failed:', error.code);
      return null;
    }
    if (!user || user.status !== 'active') return null;
    return { ...payload, fullname: user.fullname, role: user.role };
  } catch { return null; }
}
