'use client';

import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

/** Browser-side auth client for the custom /login and /register screens. */
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
