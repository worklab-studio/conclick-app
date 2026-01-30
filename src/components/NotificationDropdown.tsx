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
import { useApi } from "@/components/hooks/useApi";
import { formatDistanceToNow } from 'date-fns';

export function NotificationDropdown() {
    const { get, post, useQuery, useMutation } = useApi();

    const { data: notifications = [], refetch } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => get('/notifications'),
        refetchInterval: 60000, // Refresh every minute
    });

    const markReadMutation = useMutation({
        mutationFn: (id: string) => post('/notifications', { id }),
        onSuccess: () => refetch(),
    });

    const markAllMutation = useMutation({
        mutationFn: () => post('/notifications', { type: 'markAll' }),
        onSuccess: () => refetch(),
    });

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    const handleMarkRead = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        markReadMutation.mutate(id);
    };

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
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllMutation.mutate()}
                            className="h-auto px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No notifications yet.
                        </div>
                    ) : (
                        notifications.map((notification: any) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={cn(
                                    "flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-[hsl(0,0%,10%)] border-b border-white/5 last:border-0",
                                    !notification.read ? "bg-zinc-900/30" : "opacity-80"
                                )}
                                onClick={() => !notification.read && markReadMutation.mutate(notification.id)}
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
                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
                {/* View All Logic - can be added later if we create /notifications page */}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
