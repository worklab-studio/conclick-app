'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { Users, Globe, LayoutDashboard, Bell, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Websites', href: '/admin/websites', icon: Globe },
    { name: 'Teams', href: '/admin/teams', icon: Users }, // Reuse Users icon or find better
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  ];

  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-neutral-950 text-foreground font-sans">
        {children}
        <Toaster richColors position="bottom-right" theme="dark" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 text-foreground font-sans">
      {/* Sidebar - Highest Z-Index to prevent overlapping */}
      <aside className="w-64 border-r border-white/10 bg-neutral-900 flex flex-col fixed inset-y-0 left-0 z-[100] md:relative">
        <Link href="/admin" className="p-6 border-b border-white/10 flex items-center gap-2 hover:bg-white/5 transition-colors">
          <div className="h-6 w-6 rounded bg-indigo-500"></div>
          <span className="font-bold tracking-tight text-white">Conclick Admin</span>
        </Link>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start text-neutral-400 hover:text-white hover:bg-white/5 gap-3" asChild>
            <Link href="/logout" prefetch={false}>
              <LogOut className="h-4 w-4" />

              Sign Out
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-white/10 bg-neutral-900/50 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-sm font-medium text-neutral-400">
            {navItems.find(item => item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href))?.name || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            {/* User menu or other actions could go here */}
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
      <Toaster richColors position="bottom-right" theme="dark" />
    </div>
  );
}
