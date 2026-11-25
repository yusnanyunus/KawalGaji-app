'use client';
import { useEffect, useState } from 'react';
import Crud from '@/components/Crud';
import { rp } from '@/lib/fmt';

const group = {
  key: (r) => r.date_payment.slice(0, 7),
  label: (k) => new Date(k + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
  summary: (rs) => `${rs.length} task • ${rp(rs.reduce((s, x) => s + Number(x.price), 0))} • ${rs.filter((x) => x.checklist).length} lunas`
};

export default function Page() {
  const [m, setM] = useState({ c: [], p: [] });
  useEffect(() => { (async () => {
    const [c, p] = await Promise.all(['category', 'payment_method'].map((t) => fetch('/api/' + t).then((r) => r.json())));
    setM({ c, p });
  })(); }, []);
  const nm = (a, id) => a.find((x) => x.oid === id)?.description || '-';
  const fields = [
    { k: 'description', l: 'Deskripsi', req: false, fmt: (r) => r.description || nm(m.c, r.category_oid) },
    { k: 'price', l: 'Jumlah (Rp)', t: 'number', fmt: (r) => rp(r.price) },
    { k: 'date_payment', l: 'Tanggal bayar', t: 'date' },
    { k: 'category_oid', l: 'Kategori', t: 'select', opts: m.c.map((x) => ({ v: x.oid, l: x.description })), fmt: (r) => nm(m.c, r.category_oid) },
    { k: 'payment_method_oid', l: 'Metode pembayaran', t: 'select', opts: m.p.map((x) => ({ v: x.oid, l: x.description })), fmt: (r) => nm(m.p, r.payment_method_oid) },
    { k: 'checklist', l: 'Sudah dibayar', t: 'checkbox', fmt: (r) => (r.checklist ? 'Lunas' : 'Belum bayar') }
  ];
  return <Crud table="task_list" title="Pengeluaran" hint="Pengeluaran dikelompokkan per bulan" fields={fields} group={group} empty={{ date_payment: new Date().toISOString().slice(0, 10), checklist: false }} />;
}
