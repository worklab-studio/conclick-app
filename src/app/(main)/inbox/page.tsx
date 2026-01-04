"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Info, Bell, FileText, Sparkles, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// --- Types & Data ---

const ALL_NOTIFICATIONS = [
    {
        id: "1",
        title: "Viral Alert 🚀",
        message: "Your website just got viral - 400% increase in traffic!",
        time: "2m ago",
        timestamp: new Date().toISOString(),
        read: false,
        type: "alert",
    },
    {
        id: "2",
        title: "Happy New Year! 🎉",
        message: "Wishing you a productive year ahead.",
        time: "1h ago",
        timestamp: new Date().toISOString(),
        read: false,
        type: "info",
    },
    {
        id: "3",
        title: "New Feature: Dark Mode",
        message: "Try out the new dark mode toggle in settings.",
        time: "5h ago",
        timestamp: new Date().toISOString(),
        read: false,
        type: "info",
    },
    {
        id: "9",
        title: "Server Load High",
        message: "CPU usage exceeded 80% for 5 minutes.",
        time: "Yesterday",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: true,
        type: "warning",
    },
    {
        id: "4",
        title: "Weekly Report Ready",
        message: "Your analytics summary for the last week is available.",
        time: "Yesterday",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: true,
        type: "success",
    },
    {
        id: "5",
        title: "System Maintenance",
        message: "Scheduled maintenance completed successfully.",
        time: "2d ago",
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        read: true,
        type: "info",
    },
    {
        id: "6",
        title: "Welcome to Conclick",
        message: "Thanks for joining! Let's get started tracking.",
        time: "5d ago",
        timestamp: new Date(Date.now() - 432000000).toISOString(),
        read: true,
        type: "success",
    },
    {
        id: "7",
        title: "Payment Successful",
        message: "Your subscription has been renewed.",
        time: "1w ago",
        timestamp: new Date(Date.now() - 604800000).toISOString(),
        read: true,
        type: "success",
    },
];

const CHANGELOG = [
    {
        version: "v2.4.0",
        date: "January 4, 2026",
        title: "Dark Mode & Notifications",
        items: [
            "Added comprehensive dark mode support.",
            "Introduced new Notification Center.",
            "Improved Live Visitor real-time visualization.",
        ]
    },
    {
        version: "v2.3.5",
        date: "December 28, 2025",
        title: "Performance Improvements",
        items: [
            "Optimized query performance for large datasets.",
            "Fixed an issue with mobile responsiveness on dashboard.",
        ]
    },
    {
        version: "v2.3.0",
        date: "December 15, 2025",
        title: "Teams & Permissions",
        items: [
            "Team management features now available.",
            "Granular permissions for team members.",
            "Shared dashboards.",
        ]
    }
];

// --- Helpers ---

const getGroup = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const notificationDate = new Date(date);
    const notificationDay = new Date(notificationDate.getFullYear(), notificationDate.getMonth(), notificationDate.getDate());

    if (notificationDay.getTime() === today.getTime()) return "Today";
    if (notificationDay.getTime() === yesterday.getTime()) return "Yesterday";
    return notificationDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const getIcon = (type: string) => {
    switch (type) {
        case 'alert': return <AlertTriangle className="h-5 w-5 text-red-500" />;
        case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
        default: return <Info className="h-5 w-5 text-blue-500" />;
    }
};

// --- Components ---

function NotificationsView() {
    const groupedNotifications = ALL_NOTIFICATIONS.reduce((acc, note) => {
        const group = getGroup(new Date(note.timestamp));
        if (!acc[group]) acc[group] = [];
        acc[group].push(note);
        return acc;
    }, {} as Record<string, typeof ALL_NOTIFICATIONS>);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Activity</h2>
                    <p className="text-sm text-muted-foreground">Recent updates from your account.</p>
                </div>
                <Button variant="outline" size="sm">Mark all read</Button>
            </div>

            {Object.entries(groupedNotifications).map(([group, notifications]) => (
                <div key={group} className="space-y-4">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">{group}</h2>
                    <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)] overflow-hidden">
                        <div className="divide-y divide-white/5">
                            {notifications.map((note) => (
                                <div key={note.id} className={cn("flex gap-4 p-4 hover:bg-white/2 transition-colors cursor-pointer group", !note.read && "bg-indigo-500/5 hover:bg-indigo-500/10")}>
                                    <div className={cn("mt-1 p-2 rounded-full h-fit transition-colors", !note.read ? "bg-white/5 group-hover:bg-white/10" : "bg-transparent")}>
                                        {getIcon(note.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className={cn("text-sm font-medium", !note.read ? "text-foreground" : "text-muted-foreground")}>
                                                {note.title}
                                            </p>
                                            <span className="text-xs text-zinc-500">{note.time}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{note.message}</p>
                                    </div>
                                    {!note.read && (
                                        <div className="self-center">
                                            <div className="h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            ))}
        </div>
    );
}

function ChangelogView() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-2">
            <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight">Changelog</h2>
                <p className="text-sm text-muted-foreground">Latest updates and improvements to Conclick.</p>
            </div>

            <div className="relative border-l border-zinc-800 ml-4 space-y-12">
                {CHANGELOG.map((log) => (
                    <div key={log.version} className="relative pl-8">
                        {/* Timeline dot */}
                        <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-black" />

                        <div className="flex flex-col gap-1 mb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-foreground">{log.version}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{log.date}</span>
                            </div>
                            <h3 className="text-base font-semibold text-zinc-300">{log.title}</h3>
                        </div>

                        <ul className="list-disc list-inside space-y-2 mt-4 text-sm text-muted-foreground bg-zinc-900/50 p-4 rounded-lg border border-white/5">
                            {log.items.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function NotificationsPage() {
    const [activeTab, setActiveTab] = useState<'notifications' | 'changelog'>('notifications');

    return (
        <div className="min-h-screen bg-transparent">
            {/* Main Container tailored to match TopNav alignment */}
            <div className="mx-auto w-full px-3 md:px-6 py-10" style={{ maxWidth: '1320px' }}>
                {/* Page Header */}
                <div className="mb-10 mx-4">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Inbox</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Manage your notifications and see what's new.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-12 mx-4">
                    {/* Sidebar */}
                    <aside className="w-full md:w-64 flex-shrink-0">
                        <nav className="flex flex-col gap-1 sticky top-24">
                            <div className="px-3 mb-2">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Menu</h2>
                            </div>
                            <Button
                                variant={activeTab === 'notifications' ? "secondary" : "ghost"}
                                className={cn("justify-start gap-3", activeTab === 'notifications' && "bg-zinc-800 text-white")}
                                onClick={() => setActiveTab('notifications')}
                            >
                                <Bell className="h-4 w-4" />
                                Notifications
                                <span className="ml-auto bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">3</span>
                            </Button>
                            <Button
                                variant={activeTab === 'changelog' ? "secondary" : "ghost"}
                                className={cn("justify-start gap-3", activeTab === 'changelog' && "bg-zinc-800 text-white")}
                                onClick={() => setActiveTab('changelog')}
                            >
                                <Sparkles className="h-4 w-4" />
                                Changelog
                            </Button>
                        </nav>
                    </aside>

                    {/* Content Area */}
                    <main className="flex-1 min-w-0">
                        {activeTab === 'notifications' ? <NotificationsView /> : <ChangelogView />}
                    </main>
                </div>
            </div>
        </div>
    );
}
