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
import { useRouter, useSearchParams } from 'next/navigation';
import Link from "next/link";
import { Ripple } from "@/components/ui/ripple";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";
import { useState, Suspense } from 'react';
import { toast } from "sonner";

const formSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

function ResetPasswordFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(false);
    const [isHoveringImage, setIsHoveringImage] = useState(false);
    const [resetComplete, setResetComplete] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!token) {
            toast.error('Invalid reset link');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password: values.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setResetComplete(true);
            toast.success('Password reset successfully!');
        } catch (e: unknown) {
            const error = e as Error;
            toast.error(error.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center space-y-4">
                <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                    Invalid or missing reset token. Please request a new password reset link.
                </div>
                <Link href="/forgot-password">
                    <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
                        Request New Link
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <>
            {!resetComplete ? (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-zinc-200">New Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
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
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-zinc-200">Confirm Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            {...field}
                                            className="!bg-zinc-900 !border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                            disabled={loading}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </form>
                </Form>
            ) : (
                <div className="text-center space-y-4">
                    <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-400 text-sm">
                        Your password has been reset successfully.
                    </div>
                    <Button
                        className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                        onClick={() => router.push('/login')}
                    >
                        Go to Login
                    </Button>
                </div>
            )}
        </>
    );
}

export default function ResetPasswordForm() {
    const [isHoveringImage, setIsHoveringImage] = useState(false);

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
                        <h1 className="text-3xl font-bold text-white">Reset Password</h1>
                        <p className="text-balance text-zinc-400">
                            Enter your new password
                        </p>
                    </div>

                    <Suspense fallback={<div className="text-center text-zinc-400">Loading...</div>}>
                        <ResetPasswordFormContent />
                    </Suspense>

                    <div className="mt-4 text-center text-sm text-zinc-400">
                        Remember your password?{" "}
                        <Link href="/login" className="underline text-indigo-500 font-medium hover:text-indigo-400">
                            Back to Login
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
                    </div>
                </div>
            </div>
        </div>
    );
}
