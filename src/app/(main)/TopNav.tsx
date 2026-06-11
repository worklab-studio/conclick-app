'use client';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNavigation, useLoginQuery } from '@/components/hooks';
import { LogOut, CreditCard, User, Clock } from 'lucide-react';
import { getBillingState } from '@/lib/billing-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { LogoFull } from '@/components/logo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export function TopNav() {
  const { router } = useNavigation();
  const { user } = useLoginQuery();
  const billing = getBillingState(user);
  const username = user?.username || 'User';
  // Mock email if not available, usually derived from user object or user@example.com
  const email = user?.email || `${username.toLowerCase().replace(/\s+/g, '.')}@example.com`;

  return (
    <nav className="sticky top-0 z-50 w-full border-b dark:border-[hsl(0,0%,9%)] bg-background">
      <div className="mx-auto w-full px-3 md:px-6" style={{ maxWidth: '1320px' }}>
        <div className="flex h-16 items-center justify-between">
          {/* Logo on the left */}
          <Link href="/websites" className="flex items-center">
            <LogoFull className="h-7 w-auto" />
          </Link>

          {/* Admin dropdown on the right */}
          {/* Profile Component */}
          {/* Profile Component Redesign */}
          <div className="flex items-center gap-4">
            {/* Trial countdown + upgrade (hidden once paid; admins never see it) */}
            {billing.isTrial && !billing.isAdmin && (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5e5ba4]/30 bg-[#5e5ba4]/[.13] px-3 py-1 text-xs font-semibold text-[#c7c4f0]">
                  <Clock className="h-3 w-3" />
                  Trial · {billing.trialDaysLeft} day{billing.trialDaysLeft === 1 ? '' : 's'} left
                </span>
                <button
                  type="button"
                  onClick={() => router.push('/account/billing')}
                  className="rounded-lg bg-[#5e5ba4] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5e5ba4]/90"
                >
                  Upgrade
                </button>
              </div>
            )}

            {/* Notification Bell */}
            <NotificationDropdown />

            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2"
              >
                Admin
              </Link>
            )}

            <WorkspaceSwitcher />

            {/* Separator */}
            <div className="h-6 w-px bg-[hsl(0,0%,20%)] mx-1" />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer border-2 border-transparent hover:border-[hsl(0,0%,20%)] transition-all bg-gradient-to-br from-orange-500 to-purple-600">
                  <AvatarImage src="" alt={username} className="hidden" />
                  <AvatarFallback className="bg-transparent text-white/90 font-medium hidden">
                    {username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                className="w-[260px] p-2 dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]"
              >
                {/* User Header */}
                <div className="flex items-center gap-3 p-2 mb-1">
                  <Avatar className="h-10 w-10 border dark:border-[hsl(0,0%,12%)] bg-gradient-to-br from-orange-500 to-purple-600">
                    <AvatarImage src="" alt={username} className="hidden" />
                    <AvatarFallback className="bg-transparent text-white font-medium">
                      {username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium leading-none text-foreground">{username}</p>
                    <p className="text-xs leading-none text-muted-foreground">{email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-[hsl(0,0%,12%)] my-1" />

                {/* Menu Items */}
                <DropdownMenuItem
                  onClick={() => router.push('/account')}
                  className="cursor-pointer focus:bg-[hsl(0,0%,12%)]"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push('/account/billing')}
                  className="cursor-pointer focus:bg-[hsl(0,0%,12%)]"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Billing</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push('/logout')}
                  className="cursor-pointer focus:bg-[hsl(0,0%,12%)]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
