import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { session } from '@/lib/auth';

const COLS = {
  users: ['fullname', 'email', 'username', 'password', 'phone', 'status', 'role'],
  category: ['description'],
  payment_method: ['description'],
  task_list: ['category_oid', 'payment_method_oid', 'month_group', 'date_payment', 'description', 'price', 'checklist']
};
const SELECT = { users: 'oid,fullname,email,username,phone,status,role,created_at,updated_at' };
const err = (m, s = 400) => NextResponse.json({ error: m }, { status: s });
const parseBody = async (req) => {
  try { return { body: await req.json() }; }
  catch { return { error: err('Permintaan tidak valid') }; }
};

async function guard(params) {
  const { table } = await params;
  const s = await session();
  if (!s) return { e: err('Unauthorized', 401) };
  if (table === 'users' && s.role !== 'admin') return { e: err('Forbidden', 403) };
  if (!COLS[table]) return { e: err('Tabel tidak ditemukan', 404) };
  return { table, s };
}
async function clean(table, body) {
  const o = {};
  COLS[table].forEach((c) => { if (body[c] !== undefined) o[c] = body[c]; });
  if (table === 'task_list') {
    if (!o.month_group && o.date_payment) o.month_group = String(o.date_payment).slice(0, 7);
    if (o.month_group && !/^\d{4}-(0[1-9]|1[0-2])$/.test(o.month_group)) throw new Error('Bulan pengeluaran tidak valid');
  }
  if (table === 'users') {
    if (o.email) o.email = o.email.trim().toLowerCase();
    if (o.password) {
      if (o.password.length < 12 || o.password.length > 256) throw new Error('Password harus terdiri dari 12–256 karakter');
      o.password = await bcrypt.hash(o.password, 12);
    } else delete o.password;
    if (o.role !== undefined && !['admin', 'user'].includes(o.role)) throw new Error('Peran pengguna tidak valid');
    if (o.status !== undefined && !['active', 'inactive'].includes(o.status)) throw new Error('Status pengguna tidak valid');
  }
  return o;
}
async function hasAnotherActiveAdmin(oid) {
  const { count, error } = await db.from('users').select('oid', { count: 'exact', head: true })
    .eq('role', 'admin').eq('status', 'active').is('deleted_at', null).neq('oid', oid);
  return !error && count > 0;
}
async function monthExists(m) {
  const { count } = await db.from('task_list').select('oid', { count: 'exact', head: true })
    .is('deleted_at', null).eq('month_group', m);
  return count > 0;
}

export async function GET(_req, { params }) {
  const g = await guard(params); if (g.e) return g.e;
  let query = db.from(g.table).select(SELECT[g.table] || '*').is('deleted_at', null);
  if (g.table === 'task_list') query = query.order('month_group', { ascending: false }).order('date_payment', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) { console.error('Table read failed:', g.table, error.code); return err('Gagal memuat data', 500); }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function POST(req, { params }) {
  const g = await guard(params); if (g.e) return g.e;
  const parsed = await parseBody(req); if (parsed.error) return parsed.error;
  const body = parsed.body;
  if (!body || typeof body !== 'object') return err('Data tidak valid');
  if (Array.isArray(body) && (g.table !== 'task_list' || body.some((row) => !row || typeof row !== 'object' || Array.isArray(row)))) return err('Data tidak valid');
  if (g.table === 'task_list' && Array.isArray(body)) {
    if (!body.length || body.length > 500) return err('Jumlah data tidak valid');
    const months = [...new Set(body.map((b) => String(b.month_group || b.date_payment).slice(0, 7)))];
    for (const m of months) {
      if (!/^\d{4}-\d{2}$/.test(m)) return err('Format tanggal tidak valid');
      if (await monthExists(m)) {
        const nama = new Date(m + '-01T00:00:00Z').toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        return err(`Group task ${nama} sudah ada, tidak boleh dibuat lagi`, 409);
      }
    }
  }
  let rows;
  try { rows = await Promise.all((Array.isArray(body) ? body : [body]).map(async (b) => ({ ...(await clean(g.table, b)), oid: randomUUID().toUpperCase(), user_created: g.s.oid }))); }
  catch (e) { return err(e.message || 'Data tidak valid'); }
  const { error } = await db.from(g.table).insert(rows);
  if (error) { console.error('Table insert failed:', g.table, error.code); return err('Data gagal disimpan', 400); }
  return NextResponse.json({ ok: true });
}
export async function PUT(req, { params }) {
  const g = await guard(params); if (g.e) return g.e;
  const parsed = await parseBody(req); if (parsed.error) return parsed.error;
  const body = parsed.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.oid !== 'string') return err('Data tidak valid');
  let cleaned;
  try { cleaned = await clean(g.table, body); } catch (e) { return err(e.message || 'Data tidak valid'); }
  if (g.table === 'users' && body.oid === g.s.oid && (cleaned.role === 'user' || cleaned.status === 'inactive'))
    return err('Tidak dapat menurunkan peran atau menonaktifkan akun sendiri');
  if (g.table === 'users' && (cleaned.role === 'user' || cleaned.status === 'inactive')) {
    const { data: target } = await db.from('users').select('oid,role,status').eq('oid', body.oid).maybeSingle();
    if (target?.role === 'admin' && target.status === 'active' && !(await hasAnotherActiveAdmin(target.oid)))
      return err('Setidaknya satu admin aktif harus dipertahankan', 409);
  }
  const row = { ...cleaned, updated_at: new Date().toISOString(), user_update: g.s.oid };
  const { error } = await db.from(g.table).update(row).eq('oid', body.oid).is('deleted_at', null);
  if (error) { console.error('Table update failed:', g.table, error.code); return err('Data gagal diperbarui', 400); }
  return NextResponse.json({ ok: true });
}
export async function DELETE(req, { params }) {
  const g = await guard(params); if (g.e) return g.e;
  const sp = new URL(req.url).searchParams;
  const month = sp.get('month');
  if (month) {
    if (g.table !== 'task_list' || !/^\d{4}-\d{2}$/.test(month)) return err('Permintaan tidak valid');
    const { error } = await db.from('task_list')
      .update({ deleted_at: new Date().toISOString(), user_delete: g.s.oid })
      .is('deleted_at', null).eq('month_group', month);
    if (error) { console.error('Group soft delete failed:', error.code); return err('Data gagal dihapus', 400); }
    return NextResponse.json({ ok: true });
  }
  const oid = sp.get('oid');
  if (g.table === 'users' && oid === g.s.oid) return err('Tidak bisa menghapus akun yang sedang dipakai');
  if (g.table === 'users') {
    const { data: target } = await db.from('users').select('oid,role,status').eq('oid', oid).maybeSingle();
    if (target?.role === 'admin' && target.status === 'active' && !(await hasAnotherActiveAdmin(target.oid)))
      return err('Setidaknya satu admin aktif harus dipertahankan', 409);
  }
  const { error } = await db.from(g.table).update({ deleted_at: new Date().toISOString(), user_delete: g.s.oid }).eq('oid', oid);
  if (error) { console.error('Row soft delete failed:', g.table, error.code); return err('Data gagal dihapus', 400); }
  return NextResponse.json({ ok: true });
}
