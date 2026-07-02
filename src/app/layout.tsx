import { Suspense } from 'react';
import { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { Providers } from './Providers';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@umami/react-zen/styles.css';
import '@/styles/global.css';
import '@/styles/variables.css';

import { Toaster } from 'sonner';

// Inline script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme') || 'dark';
      document.documentElement.classList.add(theme);
      document.documentElement.style.colorScheme = theme;
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function ({ children }) {
  if (process.env.DISABLE_UI) {
    return (
      <html>
        <body></body>
      </html>
    );
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#6C63C9',
          colorText: '#fafafa',
          colorTextSecondary: '#a1a1aa',
          colorBackground: 'hsl(0, 0%, 8%)',
          colorInputBackground: '#18181b',
          colorInputText: '#fafafa',
          colorTextOnPrimaryBackground: '#ffffff',
          borderRadius: '0.5rem',
          fontFamily: '"Inter", system-ui, sans-serif',
        },
        elements: {
          rootBox: 'mx-auto w-full max-w-[25rem]',
          cardBox: 'shadow-xl',
          card: 'rounded-2xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)]',
          headerTitle: 'text-[17px] font-semibold',
          headerSubtitle: 'text-[13px] text-zinc-400',
          socialButtonsBlockButton:
            'h-10 border border-[hsl(0,0%,16%)] bg-[hsl(0,0%,10%)] transition-colors hover:bg-[hsl(0,0%,13%)]',
          socialButtonsBlockButtonText: 'text-sm font-medium text-zinc-200',
          dividerLine: 'bg-[hsl(0,0%,14%)]',
          dividerText: 'text-xs text-zinc-500',
          formFieldLabel: 'text-[13px] font-medium text-zinc-300',
          formFieldInput:
            'h-10 border border-[hsl(0,0%,16%)] bg-[#18181b] text-sm placeholder:text-muted-foreground/50 focus:border-[#6C63C9] focus:ring-1 focus:ring-[#6C63C9]',
          formButtonPrimary:
            'h-10 bg-[#6C63C9] text-sm font-semibold text-white normal-case shadow-none transition-colors hover:bg-[#5b53b8]',
          formFieldInputShowPasswordButton: 'text-zinc-500 hover:text-zinc-300',
          footerActionText: 'text-zinc-400',
          footerActionLink: 'font-medium text-[#9d95e0] hover:text-[#b3abea]',
          formResendCodeLink: 'text-[#9d95e0] hover:text-[#b3abea]',
          identityPreviewEditButton: 'text-[#9d95e0]',
        },
      }}
      localization={{
        signIn: {
          start: {
            title: 'Sign in to Conclick',
            subtitle: 'Welcome back — sign in to continue',
          },
        },
        signUp: {
          start: {
            title: 'Create your Conclick account',
            subtitle: 'Start tracking your sites in minutes',
          },
        },
      }}
      signInUrl="/login"
      signUpUrl="/register"
    >
      {/* scrollbar-gutter keeps content from shifting horizontally when a tab/filter
          switch briefly makes the page shorter than the viewport */}
      <html
        lang="en"
        className="dark [scrollbar-gutter:stable]"
        style={{ colorScheme: 'dark' }}
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
          <link rel="icon" type="image/svg+xml" href="/images/conclick-icon.svg" />
          <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/images/conclick-logo.svg" color="#5e5ba4" />
          <meta name="msapplication-TileColor" content="#5e5ba4" />
          <meta name="theme-color" content="#0a0a0a" />
          <style
            dangerouslySetInnerHTML={{
              __html: `
          html, body { 
            background-color: #09090b !important; 
            color: #fafafa !important;
          }
        `,
            }}
          />
        </head>
        <body className="bg-[#09090b] text-foreground">
          <Suspense>
            <Providers>{children}</Providers>
            <Toaster richColors position="bottom-left" />
          </Suspense>
        </body>
      </html>
    </ClerkProvider>
  );
}

export const metadata: Metadata = {
  title: {
    template: '%s | Conclick',
    default: 'Conclick',
  },
  // The app is private by default — only the public (seo) marketing pages flip
  // this to index:true. Set via the Metadata API (not a literal <head> tag) so a
  // deeper segment's robots replaces it.
  robots: { index: false, follow: false },
};
