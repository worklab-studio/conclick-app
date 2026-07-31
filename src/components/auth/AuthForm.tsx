'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

type View = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const inputCls =
  'w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-white ' +
  'placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500/60';

const primaryCls =
  'flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm ' +
  'font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-50';

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 34.9 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

/**
 * The whole owned-auth surface: Google, email/password, OTP email
 * verification, and OTP password reset — no third-party widgets.
 */
export function AuthForm({
  mode,
  next,
  googleEnabled = true,
}: {
  mode: 'login' | 'register';
  next?: string;
  /** False when the server has no Google OAuth credentials — hide the button
   *  rather than show one that can only fail. */
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Preserved across the verify hop so we can auto-sign-in after OTP.
  const pendingPassword = useRef('');

  const callbackURL = next || '/websites';

  const run = async (fn: () => Promise<{ error?: { message?: string } | null } | void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fn();
      if (res && 'error' in res && res.error) {
        setError(res.error.message || 'Something went wrong — please try again.');
        return false;
      }
      return true;
    } catch {
      setError('Something went wrong — please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const google = () => run(() => authClient.signIn.social({ provider: 'google', callbackURL }));

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authClient.signIn.email({ email, password });
    if (res.error) {
      // Unverified accounts get bounced to the OTP screen instead of an error.
      if (res.error.status === 403) {
        pendingPassword.current = password;
        await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' });
        setView('verify');
        setNotice('Check your email — we sent you a 6-digit code.');
        return;
      }
      setError(res.error.message || 'Invalid email or password.');
      return;
    }
    router.push(callbackURL);
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() =>
      authClient.signUp.email({ name: name || email.split('@')[0], email, password }),
    );
    if (ok) {
      pendingPassword.current = password;
      setView('verify');
      setNotice('Check your email — we sent you a 6-digit code.');
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() => authClient.emailOtp.verifyEmail({ email, otp }));
    if (!ok) return;
    // verifyEmail signs the user in on success; fall back to a credential
    // sign-in (we still hold the password from the previous step) if not.
    const session = await authClient.getSession();
    if (!session.data?.session && pendingPassword.current) {
      await authClient.signIn.email({ email, password: pendingPassword.current });
    }
    router.push(callbackURL);
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() =>
      authClient.emailOtp.sendVerificationOtp({ email, type: 'forget-password' }),
    );
    if (ok) {
      setView('reset');
      setNotice('Check your email — we sent you a 6-digit code.');
    }
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() => authClient.emailOtp.resetPassword({ email, otp, password }));
    if (ok) {
      const signed = await authClient.signIn.email({ email, password });
      if (!signed.error) router.push(callbackURL);
      else {
        setView('login');
        setNotice('Password updated — sign in with your new password.');
      }
    }
  };

  const resend = async (type: 'email-verification' | 'forget-password') => {
    const ok = await run(() => authClient.emailOtp.sendVerificationOtp({ email, type }));
    if (ok) setNotice('New code sent.');
  };

  const title =
    view === 'login'
      ? 'Welcome back'
      : view === 'register'
        ? 'Create your account'
        : view === 'verify'
          ? 'Verify your email'
          : view === 'forgot'
            ? 'Reset your password'
            : 'Choose a new password';

  return (
    <div className="w-[380px] max-w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur">
      <h1 className="text-center text-lg font-semibold text-white">{title}</h1>
      {view === 'login' || view === 'register' ? (
        <p className="mt-1 text-center text-xs text-zinc-500">
          Analytics that tells you what to fix.
        </p>
      ) : (
        <p className="mt-1 text-center text-xs text-zinc-500">
          {view === 'forgot' ? 'We’ll email you a 6-digit code.' : `Sent to ${email}`}
        </p>
      )}

      {googleEnabled && (view === 'login' || view === 'register') && (
        <>
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className={`${primaryCls} mt-5 !bg-white !text-zinc-900 hover:!bg-zinc-100`}
          >
            <GoogleMark /> Continue with Google
          </button>
          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-zinc-600">
            <span className="h-px flex-1 bg-zinc-800" /> or{' '}
            <span className="h-px flex-1 bg-zinc-800" />
          </div>
        </>
      )}

      {view === 'login' && (
        <form onSubmit={login} className="space-y-3">
          <input
            className={inputCls}
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className={inputCls}
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button type="submit" disabled={busy} className={primaryCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign in
          </button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              className="text-zinc-500 hover:text-zinc-300"
              onClick={() => {
                setView('forgot');
                setError(null);
              }}
            >
              Forgot password?
            </button>
            <a className="text-indigo-300 hover:text-indigo-200" href="/register">
              Create an account
            </a>
          </div>
        </form>
      )}

      {view === 'register' && (
        <form onSubmit={register} className="space-y-3">
          <input
            className={inputCls}
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
          />
          <input
            className={inputCls}
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className={inputCls}
            type="password"
            required
            minLength={8}
            placeholder="Password (8+ characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button type="submit" disabled={busy} className={primaryCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create account
          </button>
          <div className="text-center text-xs text-zinc-500">
            Already have an account?{' '}
            <a className="text-indigo-300 hover:text-indigo-200" href="/login">
              Sign in
            </a>
          </div>
        </form>
      )}

      {view === 'verify' && (
        <form onSubmit={verify} className="mt-4 space-y-3">
          <input
            className={`${inputCls} text-center text-xl font-bold tracking-[0.5em]`}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="••••••"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          <button type="submit" disabled={busy || otp.length !== 6} className={primaryCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => resend('email-verification')}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300"
          >
            Resend code
          </button>
        </form>
      )}

      {view === 'forgot' && (
        <form onSubmit={sendReset} className="mt-4 space-y-3">
          <input
            className={inputCls}
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <button type="submit" disabled={busy} className={primaryCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send code
          </button>
          <button
            type="button"
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300"
            onClick={() => setView('login')}
          >
            Back to sign in
          </button>
        </form>
      )}

      {view === 'reset' && (
        <form onSubmit={doReset} className="mt-4 space-y-3">
          <input
            className={`${inputCls} text-center text-xl font-bold tracking-[0.5em]`}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="••••••"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          <input
            className={inputCls}
            type="password"
            required
            minLength={8}
            placeholder="New password (8+ characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button type="submit" disabled={busy || otp.length !== 6} className={primaryCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Set new password
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => resend('forget-password')}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300"
          >
            Resend code
          </button>
        </form>
      )}

      {error ? <p className="mt-3 text-center text-xs text-rose-400">{error}</p> : null}
      {notice ? <p className="mt-3 text-center text-xs text-emerald-400/90">{notice}</p> : null}

      <p className="mt-5 text-center text-[10px] leading-relaxed text-zinc-600">
        By continuing you agree to our{' '}
        <a href="/terms" className="underline-offset-2 hover:text-zinc-400 hover:underline">
          terms
        </a>{' '}
        and{' '}
        <a href="/privacy" className="underline-offset-2 hover:text-zinc-400 hover:underline">
          privacy policy
        </a>
        .
      </p>
    </div>
  );
}
