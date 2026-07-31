'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Loader2, Users, AlertCircle, Check } from 'lucide-react';

function roleLabel(role?: string) {
  if (role === 'team-manager') return 'Manager';
  if (role === 'team-view-only') return 'View only';
  return 'Member';
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] p-8 text-center">
        {children}
      </div>
    </div>
  );
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = (params?.token as string) || '';
  const { data: sessionData, isPending: sessionPending } = authClient.useSession();
  const isSignedIn = !!sessionData?.session;
  const router = useRouter();
  const path = `/invite/${token}`;

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/invites/${token}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(res => active && setInvite(res))
      .catch(() => active && setError('This invitation could not be found.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      // Same-origin → the session cookie authenticates the request.
      const r = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data?.error?.message || data?.message || 'Could not accept the invitation.');
        setAccepting(false);
        return;
      }
      router.push(data?.teamId ? `/teams/${data.teamId}` : '/teams');
    } catch {
      setError('Could not accept the invitation.');
      setAccepting(false);
    }
  };

  if (loading || sessionPending) {
    return (
      <Card>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const invalid =
    !!error ||
    !invite ||
    invite.status === 'revoked' ||
    invite.status === 'accepted' ||
    invite.expired;

  if (invalid) {
    const msg = error
      ? error
      : invite?.expired
        ? 'This invitation has expired.'
        : invite?.status === 'accepted'
          ? 'This invitation has already been accepted.'
          : invite?.status === 'revoked'
            ? 'This invitation has been revoked.'
            : 'This invitation is no longer valid.';
    return (
      <Card>
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-amber-400" />
        <h1 className="text-lg font-semibold text-foreground">Invitation unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
        <a
          href="/"
          className="mt-6 inline-block text-sm font-medium text-indigo-300 hover:text-indigo-200"
        >
          Go to Conclick →
        </a>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#5e5ba4]/15 text-[#c7c5ec] ring-1 ring-inset ring-[#5e5ba4]/30">
        <Users className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">
        You&apos;re invited to join {invite.teamName}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You&apos;ll join as <span className="text-foreground">{roleLabel(invite.role)}</span>
        {invite.email ? (
          <>
            {' '}
            · invite sent to <span className="text-foreground">{invite.email}</span>
          </>
        ) : null}
      </p>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {isSignedIn ? (
        <Button
          onClick={accept}
          disabled={accepting}
          className="mt-6 w-full bg-[#5e5ba4] text-white hover:bg-[#5e5ba4]/90"
        >
          {accepting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {accepting ? 'Joining…' : `Join ${invite.teamName}`}
        </Button>
      ) : (
        <div className="mt-6 space-y-2">
          <Button
            className="w-full bg-[#5e5ba4] text-white hover:bg-[#5e5ba4]/90"
            onClick={() => router.push(`/register?next=${encodeURIComponent(path)}`)}
          >
            Sign up to join
          </Button>
          <Button
            variant="outline"
            className="w-full dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            onClick={() => router.push(`/login?next=${encodeURIComponent(path)}`)}
          >
            I already have an account
          </Button>
          <p className="pt-1 text-xs text-muted-foreground">
            Use the email this invitation was sent to.
          </p>
        </div>
      )}
    </Card>
  );
}
