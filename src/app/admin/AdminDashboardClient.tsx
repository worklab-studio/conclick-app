'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Globe, Briefcase } from 'lucide-react';

export function AdminDashboardClient() {
    const { get } = useApi();

    // Fetch counts by requesting list with limit 1
    // Fetch counts by requesting list with limit 1
    // We handle errors gracefully to prevent dashboard crash
    const usersQuery = useQuery({
        queryKey: ['admin-users-count'],
        queryFn: async () => { try { return await get('/admin/users', { pageSize: 1 }); } catch { return { count: 0 }; } }
    });
    const websitesQuery = useQuery({
        queryKey: ['admin-websites-count'],
        queryFn: async () => { try { return await get('/admin/websites', { pageSize: 1 }); } catch { return { count: 0 }; } }
    });
    const teamsQuery = useQuery({
        queryKey: ['admin-teams-count'],
        queryFn: async () => { try { return await get('/admin/teams', { pageSize: 1 }); } catch { return { count: 0 }; } }
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
                <p className="text-muted-foreground">Overview of system statistics.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-neutral-900 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-indigo-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {usersQuery.isLoading ? '...' : usersQuery.data?.count || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Active platform users</p>
                    </CardContent>
                </Card>
                <Card className="bg-neutral-900 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">Total Websites</CardTitle>
                        <Globe className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {websitesQuery.isLoading ? '...' : websitesQuery.data?.count || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Tracked properties</p>
                    </CardContent>
                </Card>
                <Card className="bg-neutral-900 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">Total Teams</CardTitle>
                        <Briefcase className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {teamsQuery.isLoading ? '...' : teamsQuery.data?.count || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Collaborative groups</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
