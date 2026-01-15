'use client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { setUser } from '@/store/app';
import { setClientAuthToken } from '@/lib/client';
import Link from 'next/link';
import { Ripple } from '@/components/ui/ripple';
import { SmoothCursor } from '@/components/ui/smooth-cursor';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { useState } from 'react';

const formSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHoveringImage, setIsHoveringImage] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Something went wrong');
      }

      const { user, token } = await response.json();

      if (token && user) {
        setClientAuthToken(token);
        setUser(user);
        await router.push('/websites');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
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
        input:-webkit-autofill:active {
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
              <img
                src="/images/conclick-logo.png"
                alt="Conclick Logo"
                className="h-12 w-auto brightness-0 invert"
              />
            </div>
            <h1 className="text-3xl font-bold text-white">Login</h1>
            <p className="text-balance text-zinc-400">
              Enter your email below to login to your account
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-200">Email or Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com or username"
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
                    <div className="flex items-center">
                      <FormLabel className="text-zinc-200">Password</FormLabel>
                      <Link
                        href="/forgot-password"
                        className="ml-auto inline-block text-sm underline text-zinc-400 hover:text-white"
                      >
                        Forgot your password?
                      </Link>
                    </div>
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
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <Button
                type="submit"
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="underline text-indigo-500 font-medium hover:text-indigo-400"
            >
              Create account
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
            // @ts-expect-error - needed for foreground CSS variable
            '--foreground': '240 5% 65%',
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
