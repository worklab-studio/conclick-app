'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

type View = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const inputCls =
  'w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-white ' +
  'placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500/70 ' +
  'focus:ring-2 focus:ring-indigo-500/20';

const labelCls = 'mb-1.5 block text-xs font-medium text-zinc-400';

const primaryCls =
  'flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm ' +
  'font-semibold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:opacity-50';

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

/** Password input with a visibility toggle (web.dev sign-in best practice). */
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  minLength?: number;
  hint?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          className={`${inputCls} pr-11`}
          type={shown ? 'text' : 'password'}
          required
          minLength={minLength}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setShown(s => !s)}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-zinc-500 transition-colors hover:text-zinc-300"
          aria-label={shown ? 'Hide password' : 'Show password on screen'}
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[11px] text-zinc-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Six-digit code field — one-time-code autocomplete lets browsers offer the
 *  emailed code directly, and numeric inputmode gives the right keypad. */
function OtpField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="one-time-code" className={labelCls}>
        6-digit code
      </label>
      <input
        id="one-time-code"
        name="one-time-code"
        className={`${inputCls} text-center text-xl font-bold tracking-[0.5em]`}
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoComplete="one-time-code"
        enterKeyHint="go"
        placeholder="••••••"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        autoFocus
      />
    </div>
  );
}

/**
 * The whole owned-auth surface: Google, email/password, OTP email
 * verification, and OTP password reset — no third-party widgets.
 *
 * Every field carries a real <label for>, a stable id/name, and the exact
 * autocomplete token browsers and password managers expect. Without those,
 * managers guess — which is how a share URL once landed in the email box.
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
        setError(res.error.message || 'Something went wrong, please try again.');
        return false;
      }
      return true;
    } catch {
      setError('Something went wrong, please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const google = () => run(() => authClient.signIn.social({ provider: 'google', callbackURL }));

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) {
      // Unverified accounts get bounced to the OTP screen instead of an error.
      if (res.error.status === 403) {
        pendingPassword.current = password;
        await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' });
        setView('verify');
        setNotice('Check your email, we sent you a 6-digit code.');
        return;
      }
      setError(res.error.message || 'That email and password don’t match.');
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
      setNotice('Check your email, we sent you a 6-digit code.');
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
      setNotice('Check your email, we sent you a 6-digit code.');
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
        setNotice('Password updated, sign in with your new password.');
      }
    }
  };

  const resend = async (type: 'email-verification' | 'forget-password') => {
    const ok = await run(() => authClient.emailOtp.sendVerificationOtp({ email, type }));
    if (ok) setNotice('New code sent.');
  };

  const heading =
    view === 'login'
      ? { title: 'Welcome back', sub: 'Sign in to your dashboard.' }
      : view === 'register'
        ? { title: 'Start tracking in minutes', sub: 'Free 14-day trial. No card required.' }
        : view === 'verify'
          ? { title: 'Verify your email', sub: `We sent a code to ${email}` }
          : view === 'forgot'
            ? { title: 'Reset your password', sub: 'We’ll email you a 6-digit code.' }
            : { title: 'Choose a new password', sub: `Code sent to ${email}` };

  const isStep = view === 'verify' || view === 'forgot' || view === 'reset';

  return (
    <div>
      {isStep ? (
        <button
          type="button"
          onClick={() => {
            setView(mode);
            setError(null);
            setNotice(null);
            setOtp('');
          }}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      ) : null}

      <h1 className="text-xl font-semibold tracking-tight text-white">{heading.title}</h1>
      <p className="mt-1 text-[13px] text-zinc-500">{heading.sub}</p>

      {googleEnabled && (view === 'login' || view === 'register') && (
        <>
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:opacity-50"
          >
            <GoogleMark /> Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-zinc-600">
            <span className="h-px flex-1 bg-zinc-800" /> or{' '}
            <span className="h-px flex-1 bg-zinc-800" />
          </div>
        </>
      )}

      {view === 'login' && (
        <form onSubmit={login} className={`space-y-4 ${googleEnabled ? '' : 'mt-6'}`}>
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              name="email"
              className={inputCls}
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              enterKeyHint="next"
              autoFocus
            />
          </div>
          <PasswordField
            id="current-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <button type="submit" disabled={busy} className={primaryCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign in
          </button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              className="text-zinc-500 transition-colors hover:text-zinc-300"
              onClick={() => {
                setView('forgot');
                setError(null);
                setNotice(null);
              }}
            >
              Forgot password?
            </button>
            <a className="text-indigo-300 transition-colors hover:text-indigo-200" href="/register">
              Create an account
            </a>
          </div>
        </form>
      )}

      {view === 'register' && (
        <form onSubmit={register} className={`space-y-4 ${googleEnabled ? '' : 'mt-6'}`}>
          <div>
            <label htmlFor="name" className={labelCls}>
              Name <span className="font-normal text-zinc-600">(optional)</span>
            </label>
            <input
              id="name"
              name="name"
              className={inputCls}
              type="text"
              placeholder="Alex Rivera"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              enterKeyHint="next"
            />
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>
              Work email
            </label>
            <input
              id="email"
              name="email"
              className={inputCls}
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              enterKeyHint="next"
            />
          </div>
          <PasswordField
            id="new-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
            hint="At least 8 characters."
          />
          <button type="submit" disabled={busy} className={primaryCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create account
          </button>
          <div className="text-center text-xs text-zinc-500">
            Already have an account?{' '}
            <a className="text-indigo-300 transition-colors hover:text-indigo-200" href="/login">
              Sign in
            </a>
          </div>
        </form>
      )}

      {view === 'verify' && (
        <form onSubmit={verify} className="mt-5 space-y-4">
          <OtpField value={otp} onChange={setOtp} />
          <button type="submit" disabled={busy || otp.length !== 6} className={primaryCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify and continue
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => resend('email-verification')}
            className="w-full text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Didn’t get it? Resend code
          </button>
        </form>
      )}

      {view === 'forgot' && (
        <form onSubmit={sendReset} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              name="email"
              className={inputCls}
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              enterKeyHint="go"
              autoFocus
            />
          </div>
          <button type="submit" disabled={busy} className={primaryCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send code
          </button>
        </form>
      )}

      {view === 'reset' && (
        <form onSubmit={doReset} className="mt-5 space-y-4">
          <OtpField value={otp} onChange={setOtp} />
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
            hint="At least 8 characters."
          />
          <button type="submit" disabled={busy || otp.length !== 6} className={primaryCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Set new password
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => resend('forget-password')}
            className="w-full text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Didn’t get it? Resend code
          </button>
        </form>
      )}

      {/* Live region so screen readers announce failures and confirmations. */}
      <div aria-live="polite" className="empty:hidden">
        {error ? (
          <p className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-300">
            {notice}
          </p>
        ) : null}
      </div>

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
