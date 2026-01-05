'use client';

import { useState } from "react";
import { User, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PreferenceSettings } from './preferences/PreferenceSettings';
import { ProfileSettings } from './profile/ProfileSettings';
import { TeamsSettings } from './teams/TeamsSettings';

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const defaultTab = (searchParams.get('tab') as 'profile' | 'preferences' | 'teams') || 'profile';
    const [activeTab, setActiveTabState] = useState<'profile' | 'preferences' | 'teams'>(defaultTab);

    const setActiveTab = (tab: 'profile' | 'preferences' | 'teams') => {
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
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Menu</h2>
                    </div>
                    <Button
                        variant={activeTab === 'profile' ? "secondary" : "ghost"}
                        className={cn("justify-start gap-3", activeTab === 'profile' && "bg-zinc-800 text-white")}
                        onClick={() => setActiveTab('profile')}
                    >
                        <User className="h-4 w-4" />
                        Profile
                    </Button>
                    <Button
                        variant={activeTab === 'preferences' ? "secondary" : "ghost"}
                        className={cn("justify-start gap-3", activeTab === 'preferences' && "bg-zinc-800 text-white")}
                        onClick={() => setActiveTab('preferences')}
                    >
                        <Settings className="h-4 w-4" />
                        Preferences
                    </Button>
                    <Button
                        variant={activeTab === 'teams' ? "secondary" : "ghost"}
                        className={cn("justify-start gap-3", activeTab === 'teams' && "bg-zinc-800 text-white")}
                        onClick={() => setActiveTab('teams')}
                    >
                        <Users className="h-4 w-4" />
                        Teams
                    </Button>
                </nav>
            </aside>

            {/* Content Area */}
            <main className="flex-1 min-w-0 space-y-6">
                {activeTab === 'profile' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold tracking-tight">Profile</h2>
                            <p className="text-sm text-muted-foreground">Manage your personal information and security.</p>
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
                {activeTab === 'teams' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold tracking-tight">Teams</h2>
                            <p className="text-sm text-muted-foreground">Manage team members and permissions.</p>
                        </div>
                        <TeamsSettings />
                    </div>
                )}
            </main>
        </div>
    );
}
