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
import { useState } from 'react';
import { toast } from "sonner";

const formSchema = z.object({
    email: z.string().email('Please enter a valid email'),
});

export default function ForgotPasswordForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isHoveringImage, setIsHoveringImage] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);

        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('Password reset requested for:', values.email);

            setEmailSent(true);
            toast.success('If an account exists with this email, you will receive a password reset link.');
        } catch (e: any) {
            toast.error('Something went wrong. Please try again.');
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
                {/* Interactive Grid Background */}
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
                            Enter your email to receive a reset link
                        </p>
                    </div>

                    {!emailSent ? (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-200">Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="name@example.com" {...field} className="!bg-zinc-900 !border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </Button>
                            </form>
                        </Form>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-300 text-sm">
                                Check your email for a link to reset your password. If it doesn&apos;t appear, check your spam folder.
                            </div>
                            <Button
                                variant="outline"
                                className="w-full bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
                                onClick={() => setEmailSent(false)}
                            >
                                Try another email
                            </Button>
                        </div>
                    )}

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
                        // Force CSS variable for Ripple to be visible grey on dark background
                        // @ts-ignore
                        "--foreground": "240 5% 65%" // Zinc-500 roughly
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
