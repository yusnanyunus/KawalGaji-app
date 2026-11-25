'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const r = useRouter();
  const [f, setF] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(null);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const d = await res.json(); setBusy(false);
    if (!res.ok) return setErr(d.error);
    setOk(d.fullname);
    setTimeout(() => { r.push('/dashboard'); r.refresh(); }, 1400);
  }
  return (
    <div className="login">
      <motion.form onSubmit={submit} className="box" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 20 }}>
        <div className="logo"><i><Wallet size={22} /></i>KawalGaji</div>
        <h1>Selamat datang!</h1>
        <p style={{ opacity: .7, fontSize: 14 }}>Masuk untuk mengawal keuangan bulananmu.</p>
        {err && <div className="err">{err}</div>}
        <div className="pw"><input className="inp" type="email" placeholder="Email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={{ color: '#12353a' }} /></div>
        <div className="pw">
          <input className="inp" type={show ? 'text' : 'password'} placeholder="Password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} style={{ color: '#12353a' }} />
          <button type="button" onClick={() => setShow(!show)} aria-label="Tampilkan password">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
        <motion.button whileTap={{ scale: .97 }} className="btn" disabled={busy}>{busy ? 'Memeriksa...' : 'Masuk'}</motion.button>
      </motion.form>
      <AnimatePresence>
        {ok && (
          <motion.div className="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" style={{ textAlign: 'center', color: '#12353a' }} initial={{ scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .2, type: 'spring' }}><CheckCircle2 size={64} color="#1f8a7a" /></motion.div>
              <h2 style={{ margin: '10px 0 4px' }}>Berhasil login</h2>
              <p style={{ color: '#6b8286' }}>Halo, {ok}! Menyiapkan dashboard...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
