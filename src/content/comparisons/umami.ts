import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "comparison",
  "slug": "umami",
  "h1": "Conclick vs Umami: An Honest Comparison",
  "metaTitle": "Conclick vs Umami: Which Analytics Tool Fits?",
  "metaDescription": "Umami is great open-source analytics. Conclick adds revenue attribution, heatmaps, and auto-detected funnels. Here is an honest side-by-side for founders.",
  "tldr": "Umami is a solid, open-source, privacy-first analytics tool, especially if you are comfortable self-hosting something free and simple. Conclick is built for founders who need to know which traffic makes money: revenue attribution from Stripe, Paddle, Polar, Lemon Squeezy, or Dodo, real-screenshot heatmaps, and auto-detected funnels with revenue lost per drop-off, all hosted for $9/month.",
  "intro": "I built Conclick because pageview counts were not telling me which traffic was actually converting to paying customers, and I was tired of stitching together three tools to get a single answer. Umami is the tool I know best: Conclick is built on Umami's open-source codebase, so I know exactly what it shares with the original and where it diverges. This comparison is my honest read of where each tool wins.",
  "sections": [
    {
      "type": "h2",
      "text": "What Each Tool Is Actually Built For",
      "id": "overview"
    },
    {
      "type": "p",
      "text": "Umami is an open-source, privacy-first analytics platform. It gives you pageviews, sessions, referrers, [bounce rates](/glossary/bounce-rate), and basic event tracking: clean, fast, and free if you host it yourself. It is a direct, honest replacement for Google Analytics for teams that care about privacy and have the technical chops to run a Postgres or MySQL database somewhere."
    },
    {
      "type": "p",
      "text": "Conclick is a paid analytics tool for bootstrapped SaaS and ecommerce founders who want to answer a different question: not just \"how many people visited\" but \"which campaigns, pages, and funnels are making me money, and where am I bleeding it.\" It is cookieless, GDPR/CCPA-friendly, and installs in about two minutes with a lightweight script. The positioning is deliberately narrow: if you do not have a payment processor connected to your product, about half of Conclick's value is unused."
    },
    {
      "type": "comparisonTable"
    },
    {
      "type": "h2",
      "text": "Where Umami Is the Better Choice",
      "id": "where-umami-wins"
    },
    {
      "type": "p",
      "text": "I want to be straight about this, because any comparison page that only talks about where the competitor loses is just a sales pitch wearing a disguise."
    },
    {
      "type": "ul",
      "items": [
        "Cost: Umami is free if you self-host. If your traffic is low and your time is cheap, that matters.",
        "Open source: You own the code. You can audit it, fork it, extend it. For regulated industries or privacy-obsessed teams, that transparency is real.",
        "Self-hosting control: If you already run infrastructure and want analytics data stored entirely on your own servers, Umami delivers that. Conclick is a hosted SaaS; your data lives on Conclick's servers.",
        "Simplicity: Umami's dashboard is clean and uncrowded. If you do not need revenue attribution or heatmaps, Conclick's additional depth might feel like noise.",
        "No vendor lock-in: You can move your Umami data anywhere. With any hosted SaaS, including Conclick, there is a dependency on continued service."
      ]
    },
    {
      "type": "p",
      "text": "If you are a developer who self-hosts as a matter of principle, or you are running a content site where revenue attribution is irrelevant, Umami is a completely reasonable choice and I would not try to talk you out of it."
    },
    {
      "type": "h2",
      "text": "Revenue Attribution: The Core Difference",
      "id": "revenue-attribution"
    },
    {
      "type": "p",
      "text": "Umami tracks events. Per their docs as of July 2026, it does not have a concept of payment processors, so there is no way to tie a Stripe charge back to the UTM campaign that drove it, the page the user landed on, or the funnel step where they almost churned. You can technically build this yourself with custom event tracking and external tooling, but you are writing integration code, not running your business."
    },
    {
      "type": "p",
      "text": "Conclick connects directly to Stripe, Paddle, Polar, Lemon Squeezy, or Dodo. Once that connection is live, every payment gets [attributed back to its source](/glossary/marketing-attribution). You can see that your Twitter ads drove 200 visitors but zero paying customers, while a single niche newsletter mention drove 18 visitors and four paying customers. That is the number that changes what you do next week."
    },
    {
      "type": "h2",
      "text": "Heatmaps, Click Maps, and Funnels",
      "id": "heatmaps-and-funnels"
    },
    {
      "type": "p",
      "text": "Umami has no heatmaps as of July 2026. Basic funnels exist in the cloud version but they are manual: you define the steps, it counts completions. There is no automatic detection of [where users are dropping](/guides/where-users-abandon-checkout) and no revenue attached to those drop-offs."
    },
    {
      "type": "p",
      "text": "Conclick takes real screenshots of your actual pages and overlays clicks, scroll depth, rage clicks, and dead clicks on top. Not approximations, but actual captures of what your users see. The funnel feature auto-detects your biggest single drop-off and calculates the revenue lost to it based on your real conversion value. That last part matters: knowing that 62% of users abandon step 3 of your checkout is useful. Knowing that step costs you an estimated $4,200/month in lost MRR is actionable."
    },
    {
      "type": "h2",
      "text": "Setup, Hosting, and Day-to-Day Use",
      "id": "setup-and-daily-use"
    },
    {
      "type": "p",
      "text": "Self-hosting Umami means provisioning a database, deploying the app (Vercel, Railway, Fly.io, or your own server), keeping it updated, and managing backups. That is maybe a couple of hours upfront and occasional maintenance. Not hard, but it is work, and it is work that compounds when something breaks at 2am."
    },
    {
      "type": "p",
      "text": "Conclick is a script tag and two minutes. There is no database to manage. Team sharing, public dashboards, and integrations with Google Search Console and GA4 (for historical import) are all handled. The daily digest (a summary of your key metrics with spikes and milestones sent by email, Slack, Discord, or Telegram) runs automatically without configuration beyond connecting the channel."
    },
    {
      "type": "h2",
      "text": "Pricing",
      "id": "pricing"
    },
    {
      "type": "p",
      "text": "Umami self-hosted: free. Umami Cloud (their managed offering): has a free tier with limited events and paid plans above that."
    },
    {
      "type": "p",
      "text": "Conclick: $9/month, or $7/month billed annually. 14-day free trial, no credit card required. There is also a one-time lifetime deal for founders who prefer to avoid recurring costs. Given that a single additional paying customer typically covers the annual cost, the ROI question usually answers itself within the first month if the revenue attribution is working."
    },
    {
      "type": "callout",
      "text": "The real cost comparison is not $9/month vs $0/month. It is $9/month vs the time you spend maintaining a self-hosted stack, plus the revenue you cannot see because your analytics have no concept of money."
    },
    {
      "type": "h2",
      "text": "The Honest Recommendation",
      "id": "who-should-use-what"
    },
    {
      "type": "p",
      "text": "Pick Umami if: you want full control of your data and are comfortable running infrastructure; you are not taking payments yet or revenue attribution is not relevant to your goals; you need something free and are willing to invest the setup time."
    },
    {
      "type": "p",
      "text": "Pick Conclick if: you run a SaaS or ecommerce product and want to know which traffic is actually converting to revenue; you want heatmaps and click maps without integrating a separate tool; you want a daily digest of spikes and milestones without building it yourself; or you just want analytics that are running and useful in under ten minutes."
    }
  ],
  "faq": [
    {
      "question": "Does Conclick require a consent banner like Google Analytics?",
      "answer": "No. Conclick is cookieless and does not track personal data, so in most jurisdictions you do not need a consent banner under GDPR or CCPA. You should still review your specific legal situation, but for the vast majority of SaaS and ecommerce sites the script runs without a consent prompt. Umami is the same on this front; both tools are genuinely privacy-friendly, which is a real advantage over GA4."
    },
    {
      "question": "Can I import my historical data from Umami into Conclick?",
      "answer": "Conclick supports importing from Google Analytics 4 and Google Search Console. Direct import from Umami is not currently a built-in feature. If you are switching, you would start fresh with Conclick's tracking script and your Umami data would stay in your Umami instance. For most founders the historical pageview data matters less than the forward-looking revenue attribution anyway."
    },
    {
      "question": "Does Umami have revenue attribution or payment processor integrations?",
      "answer": "No. Umami tracks web events but has no native integration with Stripe, Paddle, Polar, Lemon Squeezy, Dodo, or any other payment processor as of July 2026. You could theoretically build this with custom event tracking and your own data pipeline, but it is not a built-in feature and it requires ongoing engineering work to maintain."
    },
    {
      "question": "Is Conclick suitable if I am not running a paid product yet?",
      "answer": "Yes, but you will only be using a subset of the tool. Without a payment processor connected, you get privacy-first pageview analytics, heatmaps, click maps, user journeys, the live visitor map, and the daily digest, which is still more than Umami offers on the tracking side. The revenue attribution features simply have nothing to pull from until you connect a processor."
    },
    {
      "question": "What is the actual performance impact of the Conclick tracking script?",
      "answer": "The script is lightweight and loads asynchronously, so it does not block page rendering. Umami's tracker is also minimal and asynchronous. Neither tool should have a measurable impact on your Core Web Vitals. If you are running PageSpeed audits, both scripts should be essentially invisible in the waterfall."
    },
    {
      "question": "Why would I pay for Conclick instead of just running Umami for free?",
      "answer": "The short answer is revenue attribution and heatmaps. If knowing which UTM campaign drove $3,400 in MRR last month, or that your pricing page has a 78% rage-click rate on the FAQ toggle, changes how you spend your time and budget, Conclick earns back $9/month quickly. If you genuinely only need to know pageviews and referrers and you are comfortable managing hosting, Umami is the sensible free alternative and there is no shame in using it."
    }
  ],
  "internalLinks": [
    {
      "href": "/alternatives/umami",
      "label": "Best Umami alternatives",
      "group": "alternative"
    },
    {
      "href": "/vs/matomo",
      "label": "Conclick vs Matomo",
      "group": "comparison"
    },
    {
      "href": "/glossary/heatmap",
      "label": "What is a heatmap?",
      "group": "glossary"
    }
  ],
  "relatedTools": [
    "utm-builder"
  ],
  "leadMagnet": {
    "kind": "addWebsite",
    "headline": "See what Umami can't show you",
    "sub": "Add your site and Conclick shows which traffic actually makes money: heatmaps, funnels, and revenue in one dashboard. Free for 14 days, no card.",
    "ctaLabel": "Add My Website"
  },
  "datePublished": "2026-06-18",
  "dateModified": "2026-07-22",
  "comparison": {
    "competitor": "Umami",
    "competitorUrl": "https://umami.is",
    "rows": [
      {
        "feature": "Open source / self-hostable",
        "conclick": false,
        "competitor": true,
        "note": "Umami wins here: full code ownership, no vendor dependency"
      },
      {
        "feature": "Revenue attribution (Stripe, Paddle, etc.)",
        "conclick": true,
        "competitor": false,
        "note": "Conclick connects 5 processors; Umami has no payment integration as of July 2026"
      },
      {
        "feature": "Real-screenshot heatmaps & click maps",
        "conclick": true,
        "competitor": false,
        "note": "Umami has no heatmap feature as of July 2026"
      },
      {
        "feature": "Auto-detected funnels with revenue lost",
        "conclick": true,
        "competitor": "Basic manual funnels",
        "note": "Umami Cloud has simple funnels; no revenue attached"
      },
      {
        "feature": "Cookieless, usually no consent banner (jurisdiction-dependent)",
        "conclick": true,
        "competitor": true,
        "note": "Both are genuinely privacy-first"
      },
      {
        "feature": "Daily digest (email + Slack/Discord)",
        "conclick": true,
        "competitor": false,
        "note": "Umami has no built-in notification digest as of July 2026"
      },
      {
        "feature": "Setup time",
        "conclick": "~2 min, hosted",
        "competitor": "1 to 3 hrs, self-host",
        "note": "Umami requires database provisioning and deployment"
      },
      {
        "feature": "Pricing",
        "conclick": "$9/mo or lifetime",
        "competitor": "Free (self-host)",
        "note": "Umami wins on cost if you can manage hosting"
      },
      {
        "feature": "Google Search Console + GA4 import",
        "conclick": true,
        "competitor": false,
        "note": "Conclick pulls in GSC data and historical GA4 events"
      }
    ]
  }
};

export default entry;
