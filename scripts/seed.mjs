import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_FULLNAME } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD || !SEED_ADMIN_FULLNAME) {
  console.error('Isi SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan seluruh SEED_ADMIN_* di .env.local.');
  process.exit(1);
}

const email = SEED_ADMIN_EMAIL.trim().toLowerCase();
const fullname = SEED_ADMIN_FULLNAME.trim();
const password = SEED_ADMIN_PASSWORD;
if (password.length < 12 || password.length > 256 || !fullname || fullname.length > 150 || email.length > 150 || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Email/nama admin tidak valid atau password harus terdiri dari 12–256 karakter.');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: existing, error: lookupError } = await db.from('users').select('oid,username').eq('email', email).maybeSingle();
if (lookupError) {
  console.error('Pencarian akun admin gagal:', lookupError.code);
  process.exit(1);
}

const oid = existing?.oid || randomUUID().toUpperCase();
const username = existing?.username || `admin-${oid.slice(0, 8).toLowerCase()}`;
const fields = {
  fullname,
  email,
  username,
  password: await bcrypt.hash(password, 12),
  status: 'active',
  role: 'admin',
  deleted_at: null,
  updated_at: new Date().toISOString(),
  user_update: oid
};

const result = existing
  ? await db.from('users').update(fields).eq('oid', oid)
  : await db.from('users').insert({ ...fields, oid, created_at: new Date().toISOString(), user_created: oid });

if (result.error) {
  console.error('Pembuatan/pembaruan akun admin gagal:', result.error.code);
  process.exit(1);
}
console.log(`Admin siap: ${email}`);
