'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { rp } from '@/lib/fmt';

const TABS = {
  task_list: { l: 'Pengeluaran', text: (r) => `${r.description || r.category?.description || '-'} • ${rp(r.price)} • ${r.date_payment}` },
  category: { l: 'Kategori', text: (r) => r.description },
  payment_method: { l: 'Metode', text: (r) => r.description },
  users: { l: 'Pengguna', text: (r) => `${r.fullname} (${r.email})` }
};
const monthLabel = (k) => new Date(k + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
const dt = (s) => new Date(s).toLocaleDateString('id-ID', { dateStyle: 'medium' });

export default function Pengaturan() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('task_list');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pv, setPv] = useState(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => setData(await (await fetch('/api/trash')).json()), []);
  useEffect(() => { load(); }, [load]);
  if (!data) return <p className="lbl">Memuat...</p>;

  const T = TABS[tab];
  const rows = data[tab] || [];
  const list = rows.filter((r) => T.text(r).toLowerCase().includes(q.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(list.length / 10));
  const cur = Math.min(page, pages);
  const view = list.slice((cur - 1) * 10, cur * 10);
  const total = Object.values(data).reduce((s, a) => s + a.length, 0);
  const mk = (r) => r.date_payment.slice(0, 7);

  const ask = (title, payload, items, strict = false) => { setTyped(''); setPv({ title, payload, items, strict }); };
  const item = (t, r) => `${TABS[t].l}: ${TABS[t].text(r)}`;

  async function run() {
    setBusy(true);
    const res = await fetch('/api/trash', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pv.payload) });
    const d = await res.json(); setBusy(false); setPv(null);
    setMsg(res.ok ? `${d.deleted} data dihapus permanen` : d.error);
    setTimeout(() => setMsg(''), 4500);
    if (res.ok) load();
  }

  return (
    <>
      <div className="head">
        <div><h1>Pengaturan</h1><p className="sub">Hapus permanen data yang sebelumnya sudah dihapus (soft delete)</p></div>
        <button className="btn red" disabled={!total} onClick={() => ask('Kosongkan semua data terhapus?', { scope: 'all', confirm: 'HAPUS' }, Object.keys(TABS).flatMap((t) => data[t].map((r) => item(t, r))), true)}>
          <Trash2 size={18} />Kosongkan semua ({total})
        </button>
      </div>

      <div className="tabs">
        {Object.entries(TABS).map(([k, v]) => (
          <button key={k} className={'tab' + (k === tab ? ' on' : '')} onClick={() => { setTab(k); setQ(''); setPage(1); }}>{v.l} ({data[k].length})</button>
        ))}
      </div>
      <div className="sr"><Search size={16} /><input placeholder="Cari data terhapus..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>

      <div className="card grp">
        <div className="head" style={{ marginBottom: 4 }}>
          <b>Data terhapus: {T.l}</b>
          <button className="btn ghost" disabled={!rows.length} onClick={() => ask(`Hapus permanen semua data ${T.l}?`, { scope: 'table', table: tab, confirm: 'HAPUS' }, rows.map((r) => item(tab, r)), true)}>
            <Trash2 size={16} />Hapus semua {T.l}
          </button>
        </div>
        {rows.length === 0 && <p className="lbl">Tidak ada data terhapus di {T.l}.</p>}
        {rows.length > 0 && list.length === 0 && <p className="lbl">Tidak ada data yang cocok dengan "{q}".</p>}
        <AnimatePresence initial={false}>
          {view.map((r, i) => {
            const gk = tab === 'task_list' ? mk(r) : null;
            const head = gk && (i === 0 || gk !== mk(view[i - 1]));
            return (
              <motion.div key={r.oid} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 40 }}>
                {head && (
                  <div className="gh">
                    <span>{monthLabel(gk)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <small>{rows.filter((x) => mk(x) === gk).length} task</small>
                      <button className="ib red" aria-label="Hapus permanen group bulan ini" onClick={() => ask(`Hapus permanen group ${monthLabel(gk)}?`, { scope: 'group', table: 'task_list', month: gk }, rows.filter((x) => mk(x) === gk).map((x) => item('task_list', x)))}><Trash2 size={16} /></button>
                    </span>
                  </div>
                )}
                <div className="row">
                  <div className="grow"><b>{T.text(r)}</b><small>Dihapus {dt(r.deleted_at)}</small></div>
                  <button className="ib red" aria-label="Hapus permanen" onClick={() => ask('Hapus permanen data ini?', { scope: 'row', table: tab, oid: r.oid }, [item(tab, r)])}><Trash2 size={16} /></button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {list.length > 10 && (
        <div className="pg">
          <button className="ib" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Sebelumnya"><ChevronLeft size={16} /></button>
          <span className="lbl">Halaman {cur} dari {pages} • {list.length} data</span>
          <button className="ib" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Berikutnya"><ChevronRight size={16} /></button>
        </div>
      )}

      <AnimatePresence>
        {pv && (
          <motion.div className="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" style={{ textAlign: 'center' }} initial={{ scale: .85 }} animate={{ scale: 1 }} exit={{ scale: .85, opacity: 0 }}>
              <AlertTriangle size={48} color="#e0654a" />
              <h2 style={{ margin: '8px 0' }}>{pv.title}</h2>
              <p className="lbl">{pv.items.length} data akan dihapus <b>permanen</b> dari database dan tidak bisa dikembalikan. Preview:</p>
              <ul className="pv">
                {pv.items.slice(0, 8).map((t, i) => <li key={i}>• {t}</li>)}
                {pv.items.length > 8 && <li className="lbl">dan {pv.items.length - 8} data lainnya</li>}
              </ul>
              {pv.strict && (
                <label className="fld" style={{ textAlign: 'left' }}>Ketik HAPUS untuk melanjutkan
                  <input className="inp" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="HAPUS" />
                </label>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => setPv(null)}>Batal</button>
                <button className="btn red" style={{ flex: 1 }} onClick={run} disabled={busy || (pv.strict && typed !== 'HAPUS')}>{busy ? 'Menghapus...' : 'Hapus permanen'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {msg && <motion.div className="toast" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{msg}</motion.div>}
      </AnimatePresence>
    </>
  );
}
