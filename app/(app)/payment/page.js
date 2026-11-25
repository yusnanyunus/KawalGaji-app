'use client';
import Crud from '@/components/Crud';
export default function Page() { return <Crud table="payment_method" title="Metode pembayaran" hint="Daftar Metode untuk pencatatan" fields={[{ k: 'description', l: 'Deskripsi' }]} />; }
