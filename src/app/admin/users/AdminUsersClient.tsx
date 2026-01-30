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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Search, Trash, Edit, Star, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserAddForm } from './UserAddForm'; // Reusing form for now, might need wrapping

export function AdminUsersClient() {
    const { get, post, del } = useApi();
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-users', page, debouncedSearch],
        queryFn: async () => {
            return get('/admin/users', {
                page,
                query: debouncedSearch,
            });
        },
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await del(`/admin/users/${id}`);
            toast.success('User deleted');
            refetch();
        } catch (e) {
            toast.error('Failed to delete user');
        }
    };

    const handleGrantLifetime = async (id: string) => {
        try {
            await post(`/admin/users/${id}/lifetime`, {});
            toast.success('Lifetime access granted');
            refetch();
        } catch (e) {
            toast.error('Failed to grant access');
        }
    };

    const users = data?.data || [];
    const count = data?.count || 0;
    const pageSize = data?.pageSize || 10;
    const totalPages = Math.ceil(count / pageSize);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Users</h1>
                    <p className="text-muted-foreground text-sm">Manage access and permissions.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Create User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create User</DialogTitle>
                            <DialogDescription>Add a new user to the system.</DialogDescription>
                        </DialogHeader>
                        {/* We pass a custom close handler to the form if it supports it, or handle save logic */}
                        <UserAddForm
                            onSave={() => { setIsAddOpen(false); refetch(); toast.success('User created'); }}
                            onClose={() => setIsAddOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-white/10 bg-neutral-900">
                <CardHeader className="p-4 border-b border-white/10 flex flex-row items-center gap-4 space-y-0">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
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
                                <TableHead className="text-neutral-400">Username</TableHead>
                                <TableHead className="text-neutral-400">Role</TableHead>
                                <TableHead className="text-neutral-400">Websites</TableHead>
                                <TableHead className="text-neutral-400">Created</TableHead>
                                <TableHead className="text-right text-neutral-400">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found.</TableCell>
                                </TableRow>
                            ) : (
                                users.map((user: any) => (
                                    <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell className="font-medium text-white">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                                                    {user.username.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{user.username}</span>
                                                    {user.subscriptionPlan === 'lifetime' && <Badge variant="secondary" className="w-fit text-[10px] h-4 px-1 bg-yellow-500/20 text-yellow-400">LIFETIME</Badge>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-neutral-300">
                                            {user.role === 'admin' ? (
                                                <Badge variant="outline" className="border-indigo-500/50 text-indigo-400">Admin</Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-neutral-700 text-neutral-400">User</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-neutral-300">{user._count?.websites || 0}</TableCell>
                                        <TableCell className="text-neutral-300">
                                            {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 text-neutral-400 hover:text-white">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                    </DropdownMenuItem>
                                                    {user.subscriptionPlan !== 'lifetime' && (
                                                        <DropdownMenuItem onClick={() => handleGrantLifetime(user.id)}>
                                                            <Star className="mr-2 h-4 w-4 text-yellow-500" /> Grant Lifetime
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator className="bg-neutral-800" />
                                                    <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => handleDelete(user.id)}>
                                                        <Trash className="mr-2 h-4 w-4" /> Delete User
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination (Simple) */}
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
