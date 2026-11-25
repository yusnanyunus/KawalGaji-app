import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { session } from '@/lib/auth';

// urutan hapus: data yang memakai relasi dihapus lebih dulu
const ORDER = ['task_list', 'category', 'payment_method', 'users'];
const SEL = { task_list: '*, category:category_oid(description)', category: '*', payment_method: '*', users: 'oid,fullname,email,username,deleted_at' };
const err = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function GET() {
  const user = await session();
  if (!user) return err('Unauthorized', 401);
  if (user.role !== 'admin') return err('Forbidden', 403);
  const out = {};
  for (const t of ORDER) {
    const { data, error } = await getDb().from(t).select(SEL[t]).not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    if (error) { console.error('Trash listing failed:', error.code); return err('Gagal memuat data terhapus', 500); }
    out[t] = data;
  }
  return NextResponse.json(out);
}

async function purge(t, { oid, month }) {
  let q = getDb().from(t).delete().not('deleted_at', 'is', null);
  if (oid) q = q.eq('oid', oid);
  if (month) {
    const [y, m] = month.split('-').map(Number);
    q = q.gte('date_payment', `${month}-01`).lt('date_payment', new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10));
  }
  const { data, error } = await q.select('oid');
  return { n: data?.length || 0, error };
}

export async function DELETE(req) {
  const user = await session();
  if (!user) return err('Unauthorized', 401);
  if (user.role !== 'admin') return err('Forbidden', 403);
  let body;
  try { body = await req.json(); } catch { return err('Permintaan tidak valid'); }
  const { scope, table, oid, month, confirm } = body || {};
  if ((scope === 'all' || scope === 'table') && confirm !== 'HAPUS') return err('Konfirmasi penghapusan wajib diisi');
  let tables;
  if (scope === 'all') tables = ORDER;
  else if (ORDER.includes(table)) tables = [table];
  else return err('Tabel tidak valid');
  if (scope === 'row' && !oid) return err('Oid wajib diisi');
  if (scope === 'group' && (table !== 'task_list' || !/^\d{4}-\d{2}$/.test(month || ''))) return err('Group tidak valid');

  let deleted = 0;
  for (const t of tables) {
    const { n, error } = await purge(t, scope === 'row' ? { oid } : scope === 'group' ? { month } : {});
    deleted += n;
    if (error) {
      console.error('Permanent delete failed:', t, error.code);
      return err(error.code === '23503' ? `Data "${t}" masih dipakai data lain (relasi). Hapus permanen data yang memakainya terlebih dulu.` : 'Penghapusan permanen gagal', 409);
    }
  }
  return NextResponse.json({ deleted });
}
