'use client';
import Crud from '@/components/Crud';
export default function Page() { return <Crud table="category" title="Kategori pembayaran" hint="Daftar Kategori untuk pencatatan" fields={[{ k: 'description', l: 'Deskripsi' }]} />; }
