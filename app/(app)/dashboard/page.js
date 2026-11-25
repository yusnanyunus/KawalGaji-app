'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Receipt, Clock } from 'lucide-react';
import { rp } from '@/lib/fmt';

const key = (d) => d.toISOString().slice(0, 7);
export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { (async () => {
    const [t, c] = await Promise.all(['task_list', 'category'].map((x) => fetch('/api/' + x).then((r) => r.json())));
    setD({ t, c });
  })(); }, []);
  if (!d) return <p className="lbl">Memuat dashboard...</p>;

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const k = key(new Date(Date.UTC(m.getFullYear(), m.getMonth(), 1)));
    return { k, label: m.toLocaleDateString('id-ID', { month: 'short' }), total: d.t.filter((x) => x.date_payment.startsWith(k)).reduce((s, x) => s + Number(x.price), 0) };
  });
  const cur = months[5], prev = months[4];
  const thisMonth = d.t.filter((x) => x.date_payment.startsWith(cur.k));
  const unpaid = thisMonth.filter((x) => !x.checklist).reduce((s, x) => s + Number(x.price), 0);
  const diff = prev.total ? Math.round(((cur.total - prev.total) / prev.total) * 100) : null;
  const byCat = d.c.map((c) => ({ n: c.description, v: thisMonth.filter((x) => x.category_oid === c.oid).reduce((s, x) => s + Number(x.price), 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
  const catName = (id) => d.c.find((c) => c.oid === id)?.description || '-';
  const unpaidList = d.t.filter((x) => !x.checklist).sort((a, b) => a.date_payment.localeCompare(b.date_payment));
  const max = Math.max(...months.map((m) => m.total), 1);

  return (
    <>
      <h1>Halo, selamat datang!</h1>
      <p className="sub">{now.toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
      <div className="grid g3" style={{ marginBottom: 14 }}>
        {[['Pengeluaran bulan ini', rp(cur.total)], ['Belum dibayar', rp(unpaid)], ['Jumlah transaksi', thisMonth.length + ' transaksi']].map(([l, v], i) => (
          <motion.div key={l} className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }}>
            <div className="lbl">{l}</div><div className="big">{v}</div>
            {i === 0 && diff !== null && <div className="lbl" style={{ color: diff > 0 ? 'var(--red)' : 'var(--pri)', display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>{diff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{Math.abs(diff)}% dari bulan lalu</div>}
          </motion.div>
        ))}
      </div>

      <div className="grid g2" style={{ marginBottom: 14 }}>
        <div className="card">
          <b>Pengeluaran 6 bulan terakhir</b>
          <svg viewBox="0 0 320 160" width="100%" role="img" aria-label="Grafik pengeluaran per bulan" style={{ marginTop: 10 }}>
            {months.map((m, i) => {
              const h = (m.total / max) * 110, x = 12 + i * 52;
              return (
                <g key={m.k}>
                  <motion.rect x={x} width="34" rx="8" fill={i === 5 ? '#1f8a7a' : '#9edbd0'} initial={{ y: 130, height: 0 }} animate={{ y: 130 - h, height: h }} transition={{ delay: .1 + i * .07, type: 'spring', damping: 18 }} />
                  <text x={x + 17} y="148" textAnchor="middle" fontSize="11" fill="#6b8286">{m.label}</text>
                  {m.total > 0 && <text x={x + 17} y={122 - h} textAnchor="middle" fontSize="9" fill="#12353a">{m.total >= 1e6 ? (m.total / 1e6).toFixed(1) + 'jt' : Math.round(m.total / 1e3) + 'rb'}</text>}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="card">
          <b>Ringkasan pengeluaran</b>
          <p className="lbl" style={{ margin: '2px 0 8px' }}>Per kategori bulan ini</p>
          {byCat.length === 0 && <p className="lbl">Belum ada pengeluaran bulan ini.</p>}
          {byCat.map((c, i) => (
            <div key={c.n} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>{c.n}</span><b>{rp(c.v)}</b></div>
              <div className="bar"><motion.div initial={{ width: 0 }} animate={{ width: (c.v / byCat[0].v) * 100 + '%' }} transition={{ delay: .2 + i * .08, duration: .6 }} /></div>
            </div>
          ))}
        </div>
      </div>

     <div className="card" style={{ marginTop: 14 }}>
        <b>Belum lunas ({unpaidList.length})</b>
        {unpaidList.length === 0 && <p className="lbl" style={{ marginTop: 8 }}>Semua tagihan sudah lunas.</p>}
        {unpaidList.slice(0, 10).map((x, i) => (
          <motion.div key={x.oid} className="row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .1 + i * .04 }}>
            <div className="ico" style={{ background: 'var(--redbg)', color: 'var(--red)' }}><Clock size={18} /></div>
            <div className="grow"><b>{x.description || catName(x.category_oid)}</b><small>Jatuh tempo {x.date_payment} • {catName(x.category_oid)}</small></div>
            <div className="amt">{rp(x.price)}</div>
          </motion.div>
        ))}
        {unpaidList.length > 10 && <p className="lbl" style={{ marginTop: 8 }}>dan {unpaidList.length - 10} lainnya di menu Pengeluaran</p>}
      </div>

      <div className="card">
        <b>5 pengeluaran terakhir</b>
        {d.t.length === 0 && <p className="lbl" style={{ marginTop: 8 }}>Belum ada data. Catat di menu Pengeluaran.</p>}
        {d.t.slice(0, 5).map((x, i) => (
          <motion.div key={x.oid} className="row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .15 + i * .06 }}>
            <div className="ico"><Receipt size={18} /></div>
            <div className="grow"><b>{x.description || catName(x.category_oid)}</b><small><Clock size={11} style={{ verticalAlign: -1 }} /> {x.date_payment} • {catName(x.category_oid)}</small></div>
            <div className="amt">{rp(x.price)}</div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
