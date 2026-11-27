'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Receipt, Clock } from 'lucide-react';
import { rp } from '@/lib/fmt';

const key = (d) => d.toISOString().slice(0, 7);
const expenseMonth = (x) => x.month_group || x.date_payment.slice(0, 7);
export default function Dashboard() {
  const [d, setD] = useState(null);
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  useEffect(() => { (async () => {
    const [t, c] = await Promise.all(['task_list', 'category'].map((x) => fetch('/api/' + x).then((r) => r.json())));
    setD({ t, c });
  })(); }, []);
  if (!d) return <p className="lbl">Memuat dashboard...</p>;

  const now = new Date();
  const years = [...new Set([now.getFullYear(), ...d.t.map((x) => Number(expenseMonth(x).slice(0, 4)))])].sort((a, b) => b - a);
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(chartYear, i, 1);
    const k = `${chartYear}-${String(i + 1).padStart(2, '0')}`;
    return { k, label: m.toLocaleDateString('id-ID', { month: 'short' }), total: d.t.filter((x) => expenseMonth(x) === k).reduce((s, x) => s + Number(x.price), 0) };
  });
  const curKey = key(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
  const prevKey = key(new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1)));
  const cur = { k: curKey, total: d.t.filter((x) => expenseMonth(x) === curKey).reduce((s, x) => s + Number(x.price), 0) };
  const prev = { total: d.t.filter((x) => expenseMonth(x) === prevKey).reduce((s, x) => s + Number(x.price), 0) };
  const thisMonth = d.t.filter((x) => expenseMonth(x) === cur.k);
  const unpaid = thisMonth.filter((x) => !x.checklist).reduce((s, x) => s + Number(x.price), 0);
  const diff = prev.total ? Math.round(((cur.total - prev.total) / prev.total) * 100) : null;
  const byCat = d.c.map((c) => ({ n: c.description, v: thisMonth.filter((x) => x.category_oid === c.oid).reduce((s, x) => s + Number(x.price), 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
  const catName = (id) => d.c.find((c) => c.oid === id)?.description || '-';
  const unpaidList = d.t.filter((x) => !x.checklist).sort((a, b) => a.date_payment.localeCompare(b.date_payment));
  const paidList = d.t.filter((x) => x.checklist).sort((a, b) => b.date_payment.localeCompare(a.date_payment)).slice(0, 5);
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
          <div className="head"><b>Total pengeluaran per bulan</b><select className="inp" aria-label="Pilih tahun grafik" value={chartYear} onChange={(e) => setChartYear(Number(e.target.value))} style={{ width: 'auto', minWidth: 110 }}>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select></div>
          <div style={{ overflowX: 'auto' }}><svg viewBox="0 0 640 160" width="100%" role="img" aria-label={`Grafik total pengeluaran tiap bulan tahun ${chartYear}`} style={{ marginTop: 10, minWidth: 560 }}>
            {months.map((m, i) => {
              const h = (m.total / max) * 110, x = 12 + i * 52;
              return (
                <g key={m.k}>
                  <motion.rect x={x} width="34" rx="8" fill={i === now.getMonth() && chartYear === now.getFullYear() ? '#1f8a7a' : '#9edbd0'} initial={{ y: 130, height: 0 }} animate={{ y: 130 - h, height: h }} transition={{ delay: .1 + i * .04, type: 'spring', damping: 18 }} />
                  <text x={x + 17} y="148" textAnchor="middle" fontSize="11" fill="#6b8286">{m.label}</text>
                  {m.total > 0 && <text x={x + 17} y={122 - h} textAnchor="middle" fontSize="9" fill="#12353a">{m.total >= 1e6 ? (m.total / 1e6).toFixed(1) + 'jt' : Math.round(m.total / 1e3) + 'rb'}</text>}
                </g>
              );
            })}
          </svg></div>
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
        <b>5 pengeluaran lunas terakhir</b>
        {paidList.length === 0 && <p className="lbl" style={{ marginTop: 8 }}>Belum ada pengeluaran yang lunas.</p>}
        {paidList.map((x, i) => (
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
