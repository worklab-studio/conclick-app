import { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <SignIn />
    </div>
  );
}

export const metadata: Metadata = {
  title: 'Login',
};
