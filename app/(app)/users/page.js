'use client';
import Crud from '@/components/Crud';
const fields = [
  { k: 'fullname', l: 'Nama lengkap' }, { k: 'email', l: 'Email', t: 'email' }, { k: 'username', l: 'Username' },
  { k: 'password', l: 'Password', t: 'password', min: 12 }, { k: 'phone', l: 'No. telepon', req: false },
  { k: 'status', l: 'Status', t: 'select', opts: [{ v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }] },
  { k: 'role', l: 'Peran', t: 'select', opts: [{ v: 'user', l: 'Pengguna' }, { v: 'admin', l: 'Admin' }] }
];
export default function Page() { return <Crud table="users" title="Manajemen pengguna" hint="Kelola akun yang bisa masuk ke aplikasi" fields={fields} empty={{ status: 'active', role: 'user' }} />; }
