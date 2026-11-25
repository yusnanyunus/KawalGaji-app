'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Crud({ table, title, fields, empty = {}, hint, group }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [delGroup, setDelGroup] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => { setRows(await (await fetch('/api/' + table)).json()); }, [table]);
  useEffect(() => { load(); }, [load]);
  const toast = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2200); };

  async function save(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const res = await fetch('/api/' + table, { method: form.oid ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json(); setBusy(false);
    if (!res.ok) return setErr(d.error);
    setForm(null); toast('Data tersimpan'); load();
  }
  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/${table}?oid=${del.oid}`, { method: 'DELETE' });
    const d = await res.json(); setBusy(false);
    if (!res.ok) { toast(d.error); } else { toast('Data dihapus'); load(); }
    setDel(null);
  }
  async function removeGroup() {
    setBusy(true);
    const res = await fetch(`/api/${table}?month=${delGroup.k}`, { method: 'DELETE' });
    const d = await res.json(); setBusy(false);
    toast(res.ok ? `${delGroup.n} data dihapus` : d.error);
    if (res.ok) load();
    setDelGroup(null);
  }

  const first = fields[0];
  const text = (r) => fields.map((f) => (f.t === 'password' ? '' : f.fmt ? f.fmt(r) : String(r[f.k] ?? ''))).join(' ').toLowerCase();
  const list = (rows || []).filter((r) => text(r).includes(q.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(list.length / 10));
  const cur = Math.min(page, pages);
  const view = list.slice((cur - 1) * 10, cur * 10);

  return (
    <>
      <div className="head">
        <div><h1>{title}</h1><p className="sub">{hint}</p></div>
        <button className="btn" onClick={() => { setErr(''); setForm({ ...empty }); }}><Plus size={18} />Tambah</button>
      </div>
      <div className="sr"><Search size={16} /><input placeholder="Cari data..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      <div className="card grp">
        {rows === null && <p className="lbl">Memuat...</p>}
        {rows?.length === 0 && <p className="lbl">Belum ada data. Tekan Tambah untuk mulai.</p>}
        {rows?.length > 0 && list.length === 0 && <p className="lbl">Tidak ada data yang cocok dengan "{q}".</p>}
        <AnimatePresence initial={false}>
          {view.map((r, i) => {
            const gk = group?.key(r);
            const head = group && (i === 0 || gk !== group.key(view[i - 1]));
            return (
              <motion.div key={r.oid} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                {head && (
                  <div className="gh">
                    <span>{group.label(gk)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <small>{group.summary(list.filter((x) => group.key(x) === gk))}</small>
                      <button className="ib red" aria-label="Hapus semua task bulan ini" onClick={() => setDelGroup({ k: gk, n: (rows || []).filter((x) => group.key(x) === gk).length })}><Trash2 size={16} /></button>
                    </span>
                  </div>
                )}
                <div className="row">
                  <div className="grow">
                    <b>{first.fmt ? first.fmt(r) : r[first.k]}</b>
                    <small>{fields.slice(1).filter((f) => f.list !== false && f.t !== 'password').map((f) => (f.fmt ? f.fmt(r) : String(r[f.k] ?? '-'))).join(' • ')}</small>
                  </div>
                  <button className="ib" aria-label="Ubah" onClick={() => { setErr(''); setForm({ ...r, password: '' }); }}><Pencil size={16} /></button>
                  <button className="ib red" aria-label="Hapus" onClick={() => setDel(r)}><Trash2 size={16} /></button>
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
        {form && (
          <motion.div className="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.form onSubmit={save} className="modal" initial={{ y: 40, scale: .95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, opacity: 0 }}>
              <div className="head" style={{ marginBottom: 14 }}><h2>{form.oid ? 'Ubah' : 'Tambah'} data</h2><button type="button" className="ib" onClick={() => setForm(null)} aria-label="Tutup"><X size={16} /></button></div>
              {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
              {fields.map((f) => (
                <label key={f.k} className="fld">{f.l}
                  {f.t === 'select' ? (
                    <select className="inp" required={f.req !== false} value={form[f.k] ?? ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}>
                      <option value="">Pilih...</option>{f.opts?.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ) : f.t === 'checkbox' ? (
                    <input type="checkbox" checked={!!form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.checked })} style={{ width: 22, height: 22 }} />
                  ) : (
                    <input className="inp" type={f.t || 'text'} required={f.t === 'password' ? !form.oid : f.req !== false}
                      minLength={f.min}
                      placeholder={f.t === 'password' && form.oid ? 'Kosongkan jika tidak diubah' : ''}
                      value={form[f.k] ?? ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
                  )}
                </label>
              ))}
              <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
            </motion.form>
          </motion.div>
        )}
        {del && (
          <motion.div className="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" style={{ textAlign: 'center' }} initial={{ scale: .85 }} animate={{ scale: 1 }} exit={{ scale: .85, opacity: 0 }}>
              <AlertTriangle size={48} color="#e0654a" />
              <h2 style={{ margin: '8px 0' }}>Hapus data ini?</h2>
              <p className="lbl" style={{ marginBottom: 18 }}>"{first.fmt ? first.fmt(del) : del[first.k]}" akan dihapus dari daftar. Data masih tersimpan di database (soft delete).</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => setDel(null)}>Batal</button>
                <button className="btn red" style={{ flex: 1 }} onClick={remove} disabled={busy}>Ya, hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {delGroup && (
          <motion.div className="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" style={{ textAlign: 'center' }} initial={{ scale: .85 }} animate={{ scale: 1 }} exit={{ scale: .85, opacity: 0 }}>
              <AlertTriangle size={48} color="#e0654a" />
              <h2 style={{ margin: '8px 0' }}>Hapus group {group.label(delGroup.k)}?</h2>
              <p className="lbl" style={{ marginBottom: 18 }}>Semua {delGroup.n} task di bulan ini akan dihapus dari daftar. Data masih tersimpan di database (soft delete), dan bulan ini bisa dibuat lagi lewat menu Salin.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => setDelGroup(null)}>Batal</button>
                <button className="btn red" style={{ flex: 1 }} onClick={removeGroup} disabled={busy}>Ya, hapus semua</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {msg && <motion.div className="toast" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{msg}</motion.div>}
      </AnimatePresence>
    </>
  );
}
