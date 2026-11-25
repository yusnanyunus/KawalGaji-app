'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Receipt, Tags, CreditCard, Users, LogOut, Wallet, CopyPlus, Settings } from 'lucide-react';

const NAV = [
  ['/dashboard', 'Dashboard', LayoutDashboard], ['/transaksi', 'Pengeluaran', Receipt], ['/salin', 'Salin', CopyPlus],
  ['/category', 'Kategori', Tags], ['/payment', 'Metode', CreditCard], ['/users', 'Pengguna', Users],
  ['/pengaturan', 'Pengaturan', Settings]
];
export default function Shell({ children, isAdmin }) {
  const path = usePathname(); const r = useRouter();
  async function out() { await fetch('/api/logout', { method: 'POST' }); r.push('/login'); r.refresh(); }
  const items = (
    <>
      {NAV.filter(([href]) => isAdmin || !['/users', '/pengaturan'].includes(href)).map(([href, label, Icon]) => (
        <Link key={href} href={href} aria-current={path.startsWith(href) ? 'page' : undefined} className={'nav' + (path.startsWith(href) ? ' on' : '')}>
          <Icon size={20} /><span>{label}</span>
        </Link>
      ))}
    </>
  );
  return (
    <div className="shell">
      <aside className="side">
        <div className="logo"><i><Wallet size={20} /></i>KawalGaji</div>
        {items}
        <div style={{ flex: 1 }} />
        <button className="nav" onClick={out}><LogOut size={20} /><span>Keluar</span></button>
      </aside>
      <main className="main">
        <motion.div key={path} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>{children}</motion.div>
      </main>
      <nav className="bottom">{items}<button className="nav" onClick={out}><LogOut size={20} /><span>Keluar</span></button></nav>
    </div>
  );
}
