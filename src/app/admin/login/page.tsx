'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                toast.success('Welcome back, Admin');
                router.push('/admin'); // Redirect to dashboard landing
            } else {
                toast.error('Invalid credentials');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[80vh] items-center justify-center">
            <Card className="w-full max-w-md border-white/10 bg-neutral-900 shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Lock className="h-6 w-6" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-white">Admin Portal</CardTitle>
                    <CardDescription>Enter your credentials to access the control panel</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-neutral-950 border-white/10 focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-neutral-950 border-white/10 focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium" disabled={loading}>
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
