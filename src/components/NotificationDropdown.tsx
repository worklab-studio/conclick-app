"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

const NOTIFICATIONS = [
    {
        id: "1",
        title: "Viral Alert 🚀",
        message: "Your website just got viral - 400% increase in traffic!",
        time: "2m ago",
        read: false,
        type: "alert",
    },
    {
        id: "2",
        title: "Happy New Year! 🎉",
        message: "Wishing you a productive year ahead.",
        time: "1h ago",
        read: false,
        type: "info",
    },
    {
        id: "3",
        title: "New Feature: Dark Mode",
        message: "Try out the new dark mode toggle in settings.",
        time: "5h ago",
        read: false,
        type: "info",
    },
    {
        id: "4",
        title: "Weekly Report Ready",
        message: "Your analytics summary for the last week is available.",
        time: "1d ago",
        read: true,
        type: "success",
    },
    {
        id: "5",
        title: "System Maintenance",
        message: "Scheduled maintenance completed successfully.",
        time: "2d ago",
        read: true,
        type: "info",
    },
    {
        id: "6",
        title: "Welcome to Conclick",
        message: "Thanks for joining! Let's get started tracking.",
        time: "5d ago",
        read: true,
        type: "success",
    },
];

export function NotificationDropdown() {
    const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="relative group cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-1">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background translate-x-0 -translate-y-0" />
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[380px] p-0 dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)] shadow-2xl rounded-xl overflow-hidden"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-zinc-900/50">
                    <h4 className="font-semibold text-sm text-foreground">Notifications</h4>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                        Mark all read
                    </Button>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {NOTIFICATIONS.map((notification) => (
                        <DropdownMenuItem
                            key={notification.id}
                            className={cn(
                                "flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-[hsl(0,0%,10%)] border-b border-white/5 last:border-0",
                                !notification.read ? "bg-zinc-900/30" : "opacity-80"
                            )}
                        >
                            <div className="flex w-full items-start justify-between gap-2">
                                <span
                                    className={cn(
                                        "font-semibold text-sm",
                                        !notification.read ? "text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {notification.title}
                                </span>
                                {!notification.read && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {notification.message}
                            </p>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-500 font-medium">
                                <Clock className="w-3 h-3" />
                                {notification.time}
                            </div>
                        </DropdownMenuItem>
                    ))}
                </div>
                <div className="p-2 border-t border-white/5 bg-zinc-900/50 text-center">
                    <Button variant="ghost" className="w-full h-8 text-xs text-muted-foreground hover:text-foreground" asChild>
                        <Link href="/inbox">View all</Link>
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
