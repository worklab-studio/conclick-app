import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import prisma from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/email';
import { linkOrProvisionLocalUser } from '@/lib/auth-bridge';

/**
 * Self-hosted auth (replaces Clerk): Google sign-in, email/password with
 * OTP email verification, and OTP-based password reset — all stored in our
 * own Postgres (auth_* tables) with fully owned UI at /login and /register.
 *
 * The app's `user` table remains the profile/authz record; every auth_user
 * is linked (by email when one already exists — preserving roles, websites
 * and billing — otherwise freshly provisioned) via user.auth_id.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.APP_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma.client, { provider: 'postgresql' }),
  user: { modelName: 'authUser' },
  session: {
    modelName: 'authSession',
    cookieCache: { enabled: true, maxAge: 60 }, // cut per-request DB hits
  },
  account: {
    modelName: 'authAccount',
    accountLinking: {
      // Google verifies its own emails, so trust it to attach to an existing
      // account with the same address. Without this, a user who signed up
      // with a password and later clicks "Continue with Google" (or the
      // reverse) hits an "account not linked" dead end.
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  verification: { modelName: 'authVerification' },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp, type);
      },
    }),
    // Must stay last: applies Set-Cookie in Next.js server actions/handlers.
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async user => {
          // Link to an existing app user by email, or provision a new one.
          await linkOrProvisionLocalUser(user.id, user.email, user.name);
        },
      },
    },
  },
});
