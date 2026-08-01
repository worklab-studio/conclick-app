import type { PlatformId } from '@/lib/tech-detect';

/**
 * Per-platform install instructions. The platform detected on the analysis
 * step preselects the right guide, so a Framer user never reads Shopify docs.
 *
 * Steps are deliberately short and literal: the failure mode we are designing
 * against is someone closing the tab because they are not sure where the head
 * tag lives on their platform.
 */

export interface InstallGuide {
  id: PlatformId | 'html';
  label: string;
  /** Where the snippet goes, in that platform's own vocabulary. */
  steps: string[];
  /** Shown when the platform needs a paid plan or has a known gotcha. */
  caveat?: string;
  /** Deep link into the platform's own settings screen, when one exists. */
  docsUrl?: string;
}

export const GUIDES: InstallGuide[] = [
  {
    id: 'framer',
    label: 'Framer',
    steps: [
      'Open your project, then go to Site Settings and choose General.',
      'Scroll to Custom Code.',
      'Paste the snippet into "End of <head> tag".',
      'Publish your site for the change to go live.',
    ],
    caveat: 'Custom code needs a paid Framer site plan.',
    docsUrl: 'https://www.framer.com/help/articles/how-can-i-add-custom-code-to-my-site/',
  },
  {
    id: 'webflow',
    label: 'Webflow',
    steps: [
      'Open Site Settings, then the Custom Code tab.',
      'Paste the snippet into "Head Code".',
      'Save, then publish your site.',
    ],
    caveat: 'Custom code requires a paid Webflow site plan.',
    docsUrl: 'https://university.webflow.com/lesson/custom-code-in-the-head-and-body-tags',
  },
  {
    id: 'wordpress',
    label: 'WordPress',
    steps: [
      'Install a header script plugin such as WPCode, or open your theme header.',
      'Paste the snippet just before the closing </head> tag.',
      'Save your changes.',
    ],
    caveat: 'Running a caching plugin? Purge the cache so visitors get the updated page.',
  },
  {
    id: 'shopify',
    label: 'Shopify',
    steps: [
      'Go to Online Store, then Themes.',
      'Choose Actions, then Edit code.',
      'Open layout/theme.liquid and paste the snippet before </head>.',
      'Save.',
    ],
  },
  {
    id: 'wix',
    label: 'Wix',
    steps: [
      'Go to Settings, then Custom Code under Advanced.',
      'Add code to the Head, applied to all pages.',
      'Publish your site.',
    ],
    caveat: 'Custom code requires a Wix premium plan.',
  },
  {
    id: 'squarespace',
    label: 'Squarespace',
    steps: [
      'Go to Settings, then Advanced, then Code Injection.',
      'Paste the snippet into the Header field.',
      'Save.',
    ],
    caveat: 'Code injection requires a Business plan or higher.',
  },
  {
    id: 'ghost',
    label: 'Ghost',
    steps: ['Go to Settings, then Code injection.', 'Paste the snippet into Site Header.', 'Save.'],
  },
  {
    id: 'nextjs',
    label: 'Next.js',
    steps: [
      'App Router: add the script to app/layout.tsx inside the <head>, or use next/script with strategy="afterInteractive".',
      'Pages Router: add it to pages/_document.tsx inside <Head>.',
      'Deploy.',
    ],
  },
  {
    id: 'nuxt',
    label: 'Nuxt',
    steps: ['Open nuxt.config.ts.', 'Add the script under app.head.script.', 'Deploy.'],
  },
  {
    id: 'astro',
    label: 'Astro',
    steps: [
      'Open your base layout, usually src/layouts/Layout.astro.',
      'Paste the snippet inside the <head>.',
      'Deploy.',
    ],
  },
  {
    id: 'svelte',
    label: 'SvelteKit',
    steps: [
      'Open src/app.html.',
      'Paste the snippet inside %sveltekit.head% or the <head>.',
      'Deploy.',
    ],
  },
  {
    id: 'html',
    label: 'HTML',
    steps: [
      'Open the template or layout shared by every page.',
      'Paste the snippet just before the closing </head> tag.',
      'Upload or deploy the change.',
    ],
  },
];

/** Pick the guide matching a detected platform, falling back to plain HTML. */
export function guideForPlatform(platform?: PlatformId | null): InstallGuide {
  const match = GUIDES.find(g => g.id === platform);
  if (match) return match;
  // React and Vue detections are too generic to give real instructions for.
  return GUIDES.find(g => g.id === 'html') as InstallGuide;
}

/** The snippet itself. Kept in one place so every surface stays in sync. */
export function snippetFor(websiteId: string, appUrl: string): string {
  return `<script defer src="${appUrl}/script.js" data-website-id="${websiteId}"></script>`;
}
