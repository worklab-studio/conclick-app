import { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.75rem',
        padding: '2rem',
        background:
          'radial-gradient(1100px 520px at 50% -8%, rgba(99,102,241,0.20), transparent 62%), #09090b',
      }}
    >
      <img
        src="/images/conclick-logo-dark.png"
        alt="Conclick"
        width={48}
        height={48}
        style={{ height: 48, width: 'auto' }}
      />
      <SignUp />
    </div>
  );
}

export const metadata: Metadata = {
  title: 'Sign up',
};
