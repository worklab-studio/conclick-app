import { Suspense } from 'react';
import { Metadata } from 'next';
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

  // scrollbar-gutter keeps content from shifting horizontally when a tab/filter
  // switch briefly makes the page shorter than the viewport.
  return (
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
