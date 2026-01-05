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

  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="icon" href="/images/conclick-logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/conclick-logo.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/images/conclick-logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/images/conclick-logo.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/images/conclick-logo.png" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="robots" content="noindex,nofollow" />
        <style dangerouslySetInnerHTML={{
          __html: `
          html, body { 
            background-color: #09090b !important; 
            color: #fafafa !important;
          }
        `}} />
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
};
