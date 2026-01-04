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
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from 'next/navigation';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { setUser } from '@/store/app';
import { setClientAuthToken } from '@/lib/client';
import Link from "next/link";
import { Ripple } from "@/components/ui/ripple";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";
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
                    <FormLabel className="text-zinc-200">Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} className="!bg-zinc-900 !border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500" />
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
                      <Input type="password" placeholder="••••••••" {...field} className="!bg-zinc-900 !border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <Button type="submit" className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-zinc-500">
                    Or
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 gap-2" type="button">
                <GoogleLogo />
                Continue with Gmail
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link href="#" className="underline text-indigo-500 font-medium hover:text-indigo-400">
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

const GoogleLogo = () => (
  <svg
    width="1.2em"
    height="1.2em"
    id="icon-google"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block shrink-0 align-sub text-inherit size-lg"
  >
    <g clipPath="url(#clip0)">
      <path
        d="M15.6823 8.18368C15.6823 7.63986 15.6382 7.0931 15.5442 6.55811H7.99829V9.63876H12.3194C12.1401 10.6323 11.564 11.5113 10.7203 12.0698V14.0687H13.2983C14.8122 12.6753 15.6823 10.6176 15.6823 8.18368Z"
        fill="#4285F4"
      ></path>
      <path
        d="M7.99812 16C10.1558 16 11.9753 15.2915 13.3011 14.0687L10.7231 12.0698C10.0058 12.5578 9.07988 12.8341 8.00106 12.8341C5.91398 12.8341 4.14436 11.426 3.50942 9.53296H0.849121V11.5936C2.2072 14.295 4.97332 16 7.99812 16Z"
        fill="#34A853"
      ></path>
      <path
        d="M3.50665 9.53295C3.17154 8.53938 3.17154 7.4635 3.50665 6.46993V4.4093H0.849292C-0.285376 6.66982 -0.285376 9.33306 0.849292 11.5936L3.50665 9.53295Z"
        fill="#FBBC04"
      ></path>
      <path
        d="M7.99812 3.16589C9.13867 3.14825 10.241 3.57743 11.067 4.36523L13.3511 2.0812C11.9048 0.723121 9.98526 -0.0235266 7.99812 -1.02057e-05C4.97332 -1.02057e-05 2.2072 1.70493 0.849121 4.40932L3.50648 6.46995C4.13848 4.57394 5.91104 3.16589 7.99812 3.16589Z"
        fill="#EA4335"
      ></path>
    </g>
    <defs>
      <clipPath id="clip0">
        <rect width="15.6825" height="16" fill="white"></rect>
      </clipPath>
    </defs>
  </svg>
);

