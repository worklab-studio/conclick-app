'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/components/hooks/useApi';
import { useDebounce } from '@/components/hooks/useDebounce';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, Trash, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export function AdminWebsitesClient() {
    const { get, del } = useApi();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-websites', page, debouncedSearch],
        queryFn: async () => {
            return get('/admin/websites', {
                page,
                query: debouncedSearch,
            });
        },
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this website?')) return;
        try {
            await del(`/admin/websites/${id}`);
            toast.success('Website deleted');
            refetch();
        } catch (e) {
            toast.error('Failed to delete website');
        }
    };

    const websites = data?.data || [];
    const count = data?.count || 0;
    const pageSize = data?.pageSize || 10;
    const totalPages = Math.ceil(count / pageSize);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Websites</h1>
                <p className="text-muted-foreground text-sm">Manage tracked websites.</p>
            </div>

            <Card className="border-white/10 bg-neutral-900">
                <CardHeader className="p-4 border-b border-white/10">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search websites..."
                            className="pl-9 bg-neutral-950 border-white/10 text-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-neutral-950/50">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-neutral-400">Name</TableHead>
                                <TableHead className="text-neutral-400">Domain</TableHead>
                                <TableHead className="text-neutral-400">Owner</TableHead>
                                <TableHead className="text-neutral-400">Created</TableHead>
                                <TableHead className="text-right text-neutral-400">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : websites.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No websites found.</TableCell>
                                </TableRow>
                            ) : (
                                websites.map((website: any) => (
                                    <TableRow key={website.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell className="font-medium text-white">
                                            <Link href={`/websites/${website.id}`} className="hover:underline">
                                                {website.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-neutral-300">{website.domain}</TableCell>
                                        <TableCell className="text-neutral-300">
                                            {website.user?.username || (website.team?.name ? `${website.team.name} (Team)` : 'Unknown')}
                                        </TableCell>
                                        <TableCell className="text-neutral-300">
                                            {formatDistanceToNow(new Date(website.createdAt), { addSuffix: true })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <a href={`//${website.domain}`} target="_blank" rel="noreferrer">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </a>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(website.id)}>
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                >
                    Previous
                </Button>
                <div className="text-sm text-neutral-400">
                    Page {page} of {totalPages || 1}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages || isLoading}
                    className="border-white/10 bg-transparent text-white hover:bg-white/10"
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
