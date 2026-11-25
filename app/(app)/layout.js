import Shell from '@/components/Shell';
import { redirect } from 'next/navigation';
import { session } from '@/lib/auth';
export default async function AppLayout({ children }) {
  const user = await session();
  if (!user) redirect('/login');
  return <Shell isAdmin={user.role === 'admin'}>{children}</Shell>;
}
