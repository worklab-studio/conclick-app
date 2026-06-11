'use client';

import { useState } from 'react';
import { User, Settings, Users, KeyRound, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PreferenceSettings } from './preferences/PreferenceSettings';
import { ProfileSettings } from './profile/ProfileSettings';
import { TeamsSettings } from './teams/TeamsSettings';
import { ApiKeysSettings } from './ApiKeysSettings';
import { NotificationSettings } from './notifications/NotificationSettings';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

type Tab = 'profile' | 'preferences' | 'notifications' | 'teams' | 'api-keys';
const TABS: Tab[] = ['profile', 'preferences', 'notifications', 'teams', 'api-keys'];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Validate against the whitelist instead of a raw `as` cast — previously
  // any invalid value (e.g. ?tab=foo) was preserved as activeTab, and since
  // none of the render branches use strict equality with an invalid value,
  // the content area rendered blank.
  const rawTab = searchParams.get('tab');
  const defaultTab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'profile';
  const [activeTab, setActiveTabState] = useState<Tab>(defaultTab);

  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row gap-12 pt-6">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <nav className="flex flex-col gap-1 sticky top-24">
          <div className="px-3 mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Menu
            </h2>
          </div>
          <Button
            variant={activeTab === 'profile' ? 'secondary' : 'ghost'}
            className={cn(
              'justify-start gap-3',
              activeTab === 'profile' && 'bg-zinc-800 text-white',
            )}
            onClick={() => setActiveTab('profile')}
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button
            variant={activeTab === 'preferences' ? 'secondary' : 'ghost'}
            className={cn(
              'justify-start gap-3',
              activeTab === 'preferences' && 'bg-zinc-800 text-white',
            )}
            onClick={() => setActiveTab('preferences')}
          >
            <Settings className="h-4 w-4" />
            Preferences
          </Button>
          <Button
            variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
            className={cn(
              'justify-start gap-3',
              activeTab === 'notifications' && 'bg-zinc-800 text-white',
            )}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </Button>
          <Button
            variant={activeTab === 'teams' ? 'secondary' : 'ghost'}
            className={cn('justify-start gap-3', activeTab === 'teams' && 'bg-zinc-800 text-white')}
            onClick={() => setActiveTab('teams')}
          >
            <Users className="h-4 w-4" />
            Teams
          </Button>
          <Button
            variant={activeTab === 'api-keys' ? 'secondary' : 'ghost'}
            className={cn(
              'justify-start gap-3',
              activeTab === 'api-keys' && 'bg-zinc-800 text-white',
            )}
            onClick={() => setActiveTab('api-keys')}
          >
            <KeyRound className="h-4 w-4" />
            API Keys
          </Button>
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 min-w-0 space-y-6">
        {activeTab === 'profile' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight">Profile</h2>
              <p className="text-sm text-muted-foreground">
                Manage your personal information and security.
              </p>
            </div>
            <ProfileSettings />
          </div>
        )}
        {activeTab === 'preferences' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight">Preferences</h2>
              <p className="text-sm text-muted-foreground">Customize your viewing experience.</p>
            </div>
            <PreferenceSettings />
          </div>
        )}
        {activeTab === 'notifications' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Get your numbers where you already live — Slack, Discord, Telegram.
              </p>
            </div>
            <NotificationSettings />
          </div>
        )}
        {activeTab === 'teams' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight">Teams</h2>
              <p className="text-sm text-muted-foreground">Manage team members and permissions.</p>
            </div>
            <TeamsSettings />
          </div>
        )}
        {activeTab === 'api-keys' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight">API Keys</h2>
              <p className="text-sm text-muted-foreground">
                Connect AI agents and scripts to Conclick via the MCP server.
              </p>
            </div>
            <ApiKeysSettings />
          </div>
        )}
      </main>
    </div>
  );
}
