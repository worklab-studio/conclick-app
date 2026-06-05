import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateLocalUser } from '@/lib/clerk';
import { AdminShell } from './AdminShell';

// Server-side admin gate. clerkMiddleware already requires a signed-in user for
// /admin/*; this additionally enforces the local admin ROLE (granted via
// ADMIN_EMAILS). Non-admins are bounced to the dashboard. Replaces the old
// forgeable `conclick_admin_session` cookie scheme entirely.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/login');
  }

  const user = await getOrCreateLocalUser(userId);

  if (!user?.isAdmin) {
    redirect('/dashboard');
  }

  return <AdminShell>{children}</AdminShell>;
}
