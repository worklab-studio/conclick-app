import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "add-analytics-to-nextjs",
  "h1": "How to Add Analytics to a Next.js Site",
  "metaTitle": "How to Add Analytics to a Next.js Site (2026 Guide)",
  "metaDescription": "Where the tracking snippet goes in the App Router and Pages Router, script tag vs next/script, and how to fix the SPA route-change gotcha that breaks pageviews.",
  "tldr": "Add analytics to a Next.js site by loading the tracker once in your root layout with next/script (strategy afterInteractive), or with @next/third-parties for Google Analytics. The gotcha: client-side route changes never reload the page, so a naive snippet counts only the first pageview. Umami-based trackers handle that automatically. A raw Google Analytics snippet does not.",
  "intro": "I have shipped this on more Next.js apps than I can count, and the same two things break every time. People paste a vendor snippet into the wrong file, and their numbers stop making sense the moment a visitor clicks a link inside the app. Neither problem is hard once you know why it happens. So here is the whole thing: where the tag goes in the App Router, where it goes in the Pages Router, and why single page navigation quietly eats your data unless the tracker is built for it.",
  "sections": [
    {
      "type": "h2",
      "text": "The short version",
      "id": "the-short-version"
    },
    {
      "type": "p",
      "text": "Load the tracking script once, high in the tree, so it runs on every route without being torn down and rebuilt on each navigation. In the App Router that means your root layout at app/layout.tsx. In the Pages Router it means pages/_app.tsx or the custom pages/_document.tsx. Use the Script component from next/script with the default afterInteractive strategy for a plain snippet, or the @next/third-parties package if you are on Google Analytics. Then verify one thing: that a client-side route change actually fires a pageview. That last check is where most setups are silently broken."
    },
    {
      "type": "h2",
      "text": "A plain script tag works, but next/script is better",
      "id": "script-tag-vs-next-script"
    },
    {
      "type": "p",
      "text": "You can drop a raw script tag into your layout and it will run. The reason I reach for the Script component instead is control over when it loads. A third-party file competing with your own JavaScript for the main thread during hydration is a real Core Web Vitals cost, and the framework gives you a knob for it."
    },
    {
      "type": "p",
      "text": "The Script component takes a strategy prop with four values. afterInteractive is the default: it loads client-side after some hydration has happened, which is exactly what the docs recommend for analytics and tag managers. lazyOnload waits for browser idle time and suits low-priority background scripts like chat widgets. beforeInteractive loads before any first-party code and is reserved for things like consent managers and bot detectors. worker is still experimental and does not work with the App Router yet."
    },
    {
      "type": "callout",
      "text": "One rule the docs are strict about: a beforeInteractive script has to live in your root layout, and it is always injected into the document head no matter where you place it in the component. For ordinary measurement you almost never want beforeInteractive anyway. afterInteractive is the correct default."
    },
    {
      "type": "h2",
      "text": "App Router: the snippet goes in your root layout",
      "id": "app-router"
    },
    {
      "type": "p",
      "text": "In an App Router project, put the Script tag in app/layout.tsx so it is present on every page. A layout is a Server Component by default, and that is fine here: the Script component renders a normal script element on the server, so you do not need a use client directive just to load a tracker."
    },
    {
      "type": "p",
      "text": "The shape is simple. Import Script from next/script, then render it inside the html body of your root layout with your tracker source and strategy set to afterInteractive. If you are on Google Analytics, skip the hand-rolled version entirely: install @next/third-parties and render the GoogleAnalytics component with your measurement id, the one that starts with G, in the root layout. Vercel maintains that package and it applies the loading strategy for you, fetching gtag.js after hydration."
    },
    {
      "type": "p",
      "text": "The one place people go wrong here is reaching for onLoad or onReady to initialise the tracker. Those callbacks only work in Client Components, and they cannot be combined with beforeInteractive. If your snippet genuinely needs an onLoad callback, mark that specific component with use client. For a standard tag you will not need one at all."
    },
    {
      "type": "h2",
      "text": "Pages Router: same job, different file",
      "id": "pages-router"
    },
    {
      "type": "p",
      "text": "If you are still on the Pages Router, and plenty of production apps are, the equivalent home for a site-wide script is pages/_app.tsx. Render the Script component there so it wraps every page. You can also use the custom document at pages/_document.tsx, and beforeInteractive scripts have been allowed there since version 12.2.2, but _app is usually the cleaner spot for a tracker."
    },
    {
      "type": "p",
      "text": "The difference that matters between the two routers is not where the tag lives. It is how you detect navigation, which is the next section, and the Pages Router hands you a completely different API for it than the App Router does."
    },
    {
      "type": "h2",
      "text": "The gotcha nobody warns you about: route changes",
      "id": "spa-route-change-gotcha"
    },
    {
      "type": "p",
      "text": "This is the part that actually breaks analytics on a Next.js site, and it has nothing to do with which file the tag is in. The framework builds a single page application. When a visitor clicks an internal link, it swaps the page content on the client without a full browser reload. Your script loaded once, on the first page. It never runs again. So a session where someone visits four pages shows up as one pageview, and your whole funnel is wrong from day one."
    },
    {
      "type": "p",
      "text": "How you fix it depends on the tracker. The good news for anyone on an Umami-based tracker, which includes Conclick, is that you do not fix it at all. The tracker patches the History API, watching pushState, replaceState and the popstate event, and sends a fresh pageview automatically on every client-side navigation. React, Next.js, Vue and Angular all work out of the box. The one thing you must not do is also call the track function yourself inside a useEffect, because then every navigation counts twice."
    },
    {
      "type": "p",
      "text": "A raw Google Analytics gtag snippet is the opposite. Left alone it fires config a single time and stays silent after that. In the App Router the standard fix is a small Client Component that reads usePathname and useSearchParams from next/navigation and sends a pageview inside a useEffect whenever either value changes. There is a sharp edge here: useSearchParams pushes the component into client-side rendering, and if you do not wrap it in a Suspense boundary your static build will throw. Put the tracking component inside a Suspense boundary and that error disappears."
    },
    {
      "type": "p",
      "text": "In the Pages Router the same job uses the router events API instead: subscribe to router.events with routeChangeComplete inside a useEffect in _app, and send a pageview with the new URL each time it fires. If you would rather not hand-write any of this for Google Analytics, the @next/third-parties GoogleAnalytics component leans on GA4 enhanced measurement, which records pageviews from browser history events once you enable the Page changes based on browser history events option in the GA admin panel. Confirm that box is ticked, because a fresh property does not always have it on."
    },
    {
      "type": "callout",
      "text": "Whatever tracker you use, test this before you trust a single number. Open your live analytics, click through three or four internal links, and watch whether each one registers as a separate pageview in real time. Two minutes of clicking saves you a month of decisions made on data that was quietly wrong."
    },
    {
      "type": "h2",
      "text": "Which tool is honest for a small Next.js site",
      "id": "which-tool"
    },
    {
      "type": "p",
      "text": "You asked how to add measurement, not which vendor to buy, so I will keep this short and honest. For most small sites the real choice is between Google Analytics, a lightweight privacy-friendly tracker, and a product-analytics tool if you care about events and funnels more than pageviews."
    },
    {
      "type": "p",
      "text": "Google Analytics is free, powerful and the default, and the @next/third-parties integration makes it genuinely easy to add. Its cost is complexity, sampling once a property gets large, and a consent story you have to manage. Umami, Plausible and similar tools trade some depth for a script that is smaller and simpler to reason about. I build Conclick, which runs on the open-source Umami engine, so treat this as the biased part: it measures without cookies, keeps a first-party visitor id in the browser's local storage rather than a cross-site cookie, and ties revenue back to the page and campaign that produced it. Whether that local storage id lets you skip a consent banner depends on your jurisdiction and configuration, may qualify for exemption in some cases, and none of this is legal advice."
    },
    {
      "type": "p",
      "text": "The technical setup in this article is identical across all of them. Load the tag once in your layout, use next/script or the Google wrapper, and prove that route changes fire a pageview. Get those three right and the tool underneath is a preference, not a trap."
    }
  ],
  "faq": [
    {
      "question": "Where do I put the analytics script in a Next.js App Router project?",
      "answer": "In your root layout at app/layout.tsx, so it loads once and stays mounted across every route. Use the Script component from next/script with the default afterInteractive strategy, or the GoogleAnalytics component from @next/third-parties if you are on Google Analytics. A root layout is a Server Component and the Script component renders there without a use client directive."
    },
    {
      "question": "Why does my Next.js analytics only count the first page?",
      "answer": "Because the framework navigates on the client without a full reload, so a script that ran once on the first page never runs again. You need route-change tracking. An Umami-based tracker does this automatically through the History API, while a raw Google Analytics snippet needs a client component watching usePathname and useSearchParams, or GA4 enhanced measurement with the browser-history option enabled."
    },
    {
      "question": "Should I use a plain script tag or next/script?",
      "answer": "Use next/script. A plain tag works, but the Script component lets you set a loading strategy so the analytics file does not fight your own JavaScript during hydration. afterInteractive is the right default for measurement. Reserve beforeInteractive for consent managers and bot detectors, and put those in the root layout."
    },
    {
      "question": "How do I track route changes for Google Analytics in Next.js?",
      "answer": "In the App Router, add a client component that reads usePathname and useSearchParams and sends a pageview in a useEffect on change, wrapped in a Suspense boundary so the static build does not throw. In the Pages Router, subscribe to router.events routeChangeComplete inside _app. Or use @next/third-parties and enable the browser-history option in GA4 enhanced measurement."
    },
    {
      "question": "Do I need a use client directive to add an analytics script?",
      "answer": "No, not for loading the script. The next/script Script component and the @next/third-parties components render fine from a Server Component layout. You only need use client for a component that calls hooks like usePathname, or that uses the onLoad and onError callbacks, since those do not work in Server Components."
    }
  ],
  "heroWord": "nextjs",
  "category": "Analytics",
  "topics": [
    "next.js",
    "analytics",
    "next/script",
    "route tracking"
  ],
  "sources": [
    {
      "label": "Next.js: Script Component API reference (strategies, beforeInteractive placement)",
      "url": "https://nextjs.org/docs/app/api-reference/components/script"
    },
    {
      "label": "Next.js: Third-party libraries (GoogleAnalytics, pageview tracking on history changes)",
      "url": "https://nextjs.org/docs/app/guides/third-party-libraries"
    },
    {
      "label": "Next.js: useSearchParams (Suspense boundary requirement)",
      "url": "https://nextjs.org/docs/app/api-reference/functions/use-search-params"
    },
    {
      "label": "Umami docs: Track a single-page application (History API auto-tracking)",
      "url": "https://docs.umami.is/docs/guides/track-single-page-apps"
    },
    {
      "label": "Next.js: Using Google Analytics through @next/third-parties/google",
      "url": "https://nextjs.org/docs/messages/next-script-for-ga"
    }
  ],
  "internalLinks": [
    {
      "href": "/vs/google-analytics",
      "label": "Conclick vs Google Analytics",
      "group": "comparison"
    },
    {
      "href": "/vs/umami",
      "label": "Conclick vs Umami",
      "group": "comparison"
    },
    {
      "href": "/glossary/cookieless-analytics",
      "label": "What cookieless analytics means",
      "group": "glossary"
    },
    {
      "href": "/guides/ga4-migration-guide",
      "label": "The GA4 migration guide",
      "group": "guide"
    },
    {
      "href": "/tools/utm-builder",
      "label": "Build campaign UTMs",
      "group": "tool"
    }
  ],
  "relatedTools": [
    "utm-builder"
  ],
  "leadMagnet": {
    "kind": "addWebsite",
    "headline": "Put this into practice",
    "sub": "Conclick gives you privacy-first analytics, heatmaps, funnels, and revenue attribution in one. Free for 14 days, no card.",
    "ctaLabel": "Add My Website"
  },
  "datePublished": "2026-07-22",
  "dateModified": "2026-07-22"
};

export default entry;
