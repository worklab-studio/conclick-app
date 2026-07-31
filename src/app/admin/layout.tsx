import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/better-auth';
import { getLocalUserByAuthId } from '@/lib/auth-bridge';
import { AdminShell } from './AdminShell';

// Server-side admin gate. Middleware already requires a session cookie for
// /admin/*; this additionally verifies the session and enforces the local
// admin ROLE (granted via ADMIN_EMAILS). Non-admins bounce to the dashboard.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await getLocalUserByAuthId(session.user.id, session.user.email, session.user.name);

  if (!user?.isAdmin) {
    redirect('/dashboard');
  }

  return <AdminShell>{children}</AdminShell>;
}
