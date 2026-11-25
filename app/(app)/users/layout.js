import { redirect } from 'next/navigation';
import { session } from '@/lib/auth';

export default async function UsersLayout({ children }) {
  const user = await session();
  if (!user || user.role !== 'admin') redirect('/dashboard');
  return children;
}
