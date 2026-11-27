'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CopyPlus, Search } from 'lucide-react';
import { rp } from '@/lib/fmt';

const label = (k) => new Date(k + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
const shift = (date, target) => {
  const [y, m] = target.split('-').map(Number);
  return `${target}-${String(Math.min(Number(date.slice(8, 10)), new Date(y, m, 0).getDate())).padStart(2, '0')}`;
};

export default function Salin() {
  const [tasks, setTasks] = useState(null);
  const [cats, setCats] = useState([]);
  const [src, setSrc] = useState('');
  const [target, setTarget] = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState('');

  const load = async () => {
    const [t, c] = await Promise.all(['task_list', 'category'].map((x) => fetch('/api/' + x).then((r) => r.json())));
    setTasks(t); setCats(c);
  };
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const g = {};
    (tasks || []).forEach((t) => { const k = t.month_group || t.date_payment.slice(0, 7); g[k] = g[k] || { k, n: 0, total: 0 }; g[k].n++; g[k].total += Number(t.price); });
    return Object.values(g).sort((a, b) => b.k.localeCompare(a.k));
  }, [tasks]);

  useEffect(() => {
    if (!tasks) return;
    const cur = src || (groups.find((g) => g.k < target) || groups[0])?.k || '';
    if (cur !== src) return setSrc(cur);
    setItems(tasks.filter((t) => (t.month_group || t.date_payment.slice(0, 7)) === src).map((t) => ({ ...t, on: true, orig: t.date_payment, date_payment: shift(t.date_payment, target), month_group: target, checklist: false })));
  }, [tasks, src]); // eslint-disable-line

  const upd = (oid, patch) => setItems((a) => a.map((i) => (i.oid === oid ? { ...i, ...patch } : i)));
  const changeTarget = (v) => { setTarget(v); setMsg(''); setDone(''); if (v) setItems((a) => a.map((i) => ({ ...i, date_payment: shift(i.orig, v) }))); };
  const chosen = items.filter((i) => i.on);
  const exists = !!target && groups.some((g) => g.k === target);
  const catName = (id) => cats.find((c) => c.oid === id)?.description || '-';
  const view = items.filter((i) => `${i.description} ${catName(i.category_oid)}`.toLowerCase().includes(q.toLowerCase()));

  async function copy() {
    setBusy(true); setMsg('');
    const rows = chosen.map(({ category_oid, payment_method_oid, month_group, date_payment, description, price }) => ({ category_oid, payment_method_oid, month_group, date_payment, description, price, checklist: false }));
    const res = await fetch('/api/task_list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setDone(target); setMsg(`${rows.length} task berhasil disalin ke ${label(target)}`); load(); }
    else setMsg(d.error || 'Gagal menyalin, coba lagi');
  }

  if (!tasks) return <p className="lbl">Memuat...</p>;
  return (
    <>
      <h1>Salin dari bulan lalu</h1>
      <p className="sub">Pilih bulan sumber, sesuaikan harga, tanggal, dan deskripsi, lalu salin ke bulan tujuan.</p>
      {groups.length === 0 && <div className="card"><p className="lbl">Belum ada pengeluaran untuk disalin. Catat dulu di menu Pengeluaran.</p></div>}
      <div className="chips">
        {groups.map((g) => (
          <button key={g.k} className={'chip' + (g.k === src ? ' on' : '')} onClick={() => setSrc(g.k)}>
            <b>{label(g.k)}</b><small>{g.n} task • {rp(g.total)}</small>
          </button>
        ))}
      </div>
      {src && (
        <div className="card">
          <div className="head" style={{ marginBottom: 12 }}>
            <label className="fld" style={{ margin: 0 }}>Salin ke bulan
              <input className="inp" type="month" value={target} onChange={(e) => changeTarget(e.target.value)} />
            </label>
            <div className="lbl">Total terpilih: <b style={{ color: 'var(--ink)' }}>{rp(chosen.reduce((s, i) => s + Number(i.price || 0), 0))}</b></div>
          </div>
          {exists && done !== target && !msg && <div className="err" style={{ marginBottom: 10 }}>Group task {label(target)} sudah ada, tidak boleh dibuat lagi. Pilih bulan tujuan yang belum punya task.</div>}
          {msg && <div className={done === target ? 'ok' : 'err'} style={{ marginBottom: 10 }}>{msg}</div>}
          <div className="sr"><Search size={16} /><input placeholder="Cari task..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {view.map((i) => (
            <motion.div key={i.oid} className="it" layout>
              <input type="checkbox" checked={i.on} onChange={(e) => upd(i.oid, { on: e.target.checked })} style={{ width: 20, height: 20 }} aria-label="Sertakan" />
              <div><input className="inp" value={i.description || ''} placeholder="Deskripsi" onChange={(e) => upd(i.oid, { description: e.target.value })} /><small className="lbl">{catName(i.category_oid)}</small></div>
              <input className="inp" type="number" value={i.price} onChange={(e) => upd(i.oid, { price: e.target.value })} aria-label="Harga" />
              <input className="inp" type="date" value={i.date_payment} onChange={(e) => upd(i.oid, { date_payment: e.target.value })} aria-label="Tanggal" />
            </motion.div>
          ))}
          <button className="btn" style={{ width: '100%', marginTop: 16 }} disabled={busy || !chosen.length || !target || exists} onClick={copy}>
            <CopyPlus size={18} />{busy ? 'Menyalin...' : `Salin ${chosen.length} task ke ${target ? label(target) : '...'}`}
          </button>
        </div>
      )}
    </>
  );
}
