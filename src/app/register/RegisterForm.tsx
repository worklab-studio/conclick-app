'use client';
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Ripple } from "@/components/ui/ripple";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";
import { useState, useEffect, useCallback } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

const formSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function RegisterForm() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isHoveringImage, setIsHoveringImage] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
        },
    });

    const username = form.watch('username');

    // Debounced username check
    const checkUsername = useCallback(async (value: string) => {
        if (value.length < 3) {
            setUsernameStatus('idle');
            return;
        }

        setUsernameStatus('checking');
        try {
            const res = await fetch('/api/auth/check-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: value }),
            });
            const data = await res.json();
            setUsernameStatus(data.available ? 'available' : 'taken');
        } catch {
            setUsernameStatus('idle');
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (username && username.length >= 3) {
                checkUsername(username);
            } else {
                setUsernameStatus('idle');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username, checkUsername]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (usernameStatus === 'taken') {
            setError('Username is already taken');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: values.username,
                    email: values.email,
                    password: values.password,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Something went wrong');
            }

            router.push('/login?registered=true');
        } catch (e: unknown) {
            const error = e as Error;
            setError(error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2 bg-black">
            <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active{
            -webkit-box-shadow: 0 0 0 30px #18181b inset !important;
            -webkit-text-fill-color: white !important;
            caret-color: white !important;
        }
      `}</style>
            <div className="relative flex items-center justify-center py-12 bg-black overflow-hidden">
                <InteractiveGridPattern
                    className="absolute inset-0 z-0 stroke-zinc-900 [mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
                    width={40}
                    height={40}
                    squaresClassName="fill-zinc-800"
                />

                <div className="mx-auto grid w-[350px] gap-6 relative z-10 bg-black/50 p-6 rounded-xl backdrop-blur-sm border border-zinc-900/50">
                    <div className="grid gap-2 text-center">
                        <div className="flex justify-center mb-4">
                            <img src="/images/conclick-logo.png" alt="Conclick Logo" className="h-12 w-auto brightness-0 invert" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Create Account</h1>
                        <p className="text-balance text-zinc-400">
                            Start your 14-day free trial
                        </p>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-200">Username</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    placeholder="johndoe"
                                                    {...field}
                                                    className="!bg-zinc-900 !border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500 pr-10"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    {usernameStatus === 'checking' && (
                                                        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                                                    )}
                                                    {usernameStatus === 'available' && (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    )}
                                                    {usernameStatus === 'taken' && (
                                                        <X className="h-4 w-4 text-red-500" />
                                                    )}
                                                </div>
                                            </div>
                                        </FormControl>
                                        {usernameStatus === 'taken' && (
                                            <p className="text-sm text-red-500">Username is already taken</p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-200">Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="you@example.com"
                                                {...field}
                                                className="!bg-zinc-900 !border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-200">Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} className="!bg-zinc-900 !border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {error && <div className="text-red-500 text-sm">{error}</div>}

                            <Button
                                type="submit"
                                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                                disabled={loading || usernameStatus === 'taken'}
                            >
                                {loading ? 'Creating account...' : 'Start Free Trial'}
                            </Button>

                            <p className="text-center text-xs text-zinc-500">
                                14 days free • No credit card required
                            </p>
                        </form>
                    </Form>

                    <div className="mt-4 text-center text-sm text-zinc-400">
                        Already have an account?{" "}
                        <Link href="/login" className="underline text-indigo-500 font-medium hover:text-indigo-400">
                            Login
                        </Link>
                    </div>
                </div>

            </div>
            <div className="hidden lg:block relative">
                <div
                    className="flex flex-col items-center justify-center bg-zinc-950 border border-zinc-900 rounded-3xl relative overflow-hidden m-4 h-[calc(100vh-2rem)]"
                    onMouseEnter={() => setIsHoveringImage(true)}
                    onMouseLeave={() => setIsHoveringImage(false)}
                    style={{
                        // @ts-expect-error - CSS variable for Ripple
                        "--foreground": "240 5% 65%"
                    }}
                >
                    <div className="absolute inset-0 text-zinc-500/30">
                        <Ripple mainCircleOpacity={0.15} />
                    </div>
                    <SmoothCursor enabled={isHoveringImage} />
                    <div className="z-20 text-center relative">
                        <h2 className="text-2xl font-bold tracking-widest text-zinc-500 mb-2">CONCLICK</h2>
                        <p className="text-zinc-600">Analytics for the Future</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
