import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "comparison",
  "slug": "umami",
  "h1": "Conclick vs Umami: An Honest Comparison",
  "metaTitle": "Conclick vs Umami: Which Analytics Tool Fits?",
  "metaDescription": "Umami is great open-source analytics. Conclick adds revenue attribution and funnels with the money attached. An honest side-by-side for founders.",
  "primaryKeyword": "conclick vs umami",
  "tldr": "Umami is a solid, open-source, privacy-first analytics tool if you are comfortable self-hosting. Conclick is built for founders who need to know which traffic makes money: revenue pulled straight from Stripe, Paddle, Polar, Lemon Squeezy, or Dodo and attributed back to its source, heatmaps filterable to paying visitors, and auto-detected funnels with revenue lost per drop-off, hosted for $9/month.",
  "intro": "Conclick began as a fork of Umami, which makes this the one comparison I have no room to be vague about. Pageview counts were not telling me which traffic converted to paying customers, and I was tired of stitching three tools together to get a single answer, so I built the missing half onto a codebase I already trusted. That means I know exactly what the two share and where they diverge. This comparison is my honest read of where each tool wins.",
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
        "Simplicity: Umami's dashboard is clean and uncrowded. If you do not need revenue attribution, Conclick's additional depth might feel like noise.",
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
      "text": "Umami has its own Revenue and Attribution reports, so it can already tie revenue back to a UTM campaign or referrer under a first-click or last-click model. The gap is upstream of the report: per their docs as of July 2026 there is no payment-processor connector, so the only money Umami knows about is money you send it yourself as event data. Nothing reconciles against Stripe, which means refunds, failed charges, disputes, and off-session renewals never arrive at all, and the number in the report drifts away from the number in your bank account."
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
      "text": "Umami shipped click and scroll heatmap reports in version 3.2.0 in June 2026, so the honest gap here is narrower than most comparison pages will tell you: both tools draw heatmaps. Funnels are where the difference is real. Umami's are manual: you define the steps, it counts completions. There is no automatic detection of [where users are dropping](/guides/where-users-abandon-checkout) and no revenue attached to those drop-offs."
    },
    {
      "type": "p",
      "text": "Both tools draw their maps over the real page rather than a wireframe, so that is not the line either. Umami's own docs frame dead clicks as something you go and spot by reading the click map; Conclick classifies rage clicks and dead clicks as their own layers, and lets you narrow the whole map to the visitors who actually paid, which is only possible because the revenue arrived from the processor in the first place. That is a difference of degree over Umami's maps, not of kind, and I would rather say so than pretend the feature does not exist upstream. The funnel feature auto-detects your biggest single drop-off and calculates the revenue lost to it based on your real conversion value. That last part matters: knowing that 62% of users abandon step 3 of your checkout is useful. Knowing that step costs you an estimated $4,200/month in lost MRR is actionable."
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
      "text": "The real cost comparison is not $9/month vs $0/month. It is $9/month vs the time you spend maintaining a self-hosted stack, plus the revenue you cannot see because nothing in that stack is wired to the processor the money actually lands in."
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
      "text": "Pick Conclick if: you run a SaaS or ecommerce product and want to know which traffic is actually converting to revenue; you want click maps sitting in the same dashboard as the revenue they produced, without integrating a separate tool; you want a daily digest of spikes and milestones without building it yourself; or you just want analytics that are running and useful in under ten minutes."
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
      "answer": "Those are two different questions and they get different answers. Umami does have revenue attribution: it ships Revenue and Attribution reports that credit revenue to a UTM source, medium, or referrer under first-click or last-click. What it has, per their docs as of July 2026, is no native integration with Stripe, Paddle, Polar, Lemon Squeezy, Dodo, or any other payment processor, so the revenue those reports work from is revenue you instrument and send in yourself. Conclick connects to the processor directly, which is what makes refunds, failed charges, and off-session renewals show up without you maintaining a pipeline."
    },
    {
      "question": "Is Conclick suitable if I am not running a paid product yet?",
      "answer": "Yes, but you will only be using a subset of the tool. Without a payment processor connected, you get privacy-first pageview analytics, heatmaps, click maps, user journeys, the live visitor map, and the daily digest. The revenue features simply have nothing to pull from until you connect a processor, and at that point the honest comparison is much closer: this is the case where Umami being free matters most."
    },
    {
      "question": "What is the actual performance impact of the Conclick tracking script?",
      "answer": "The script is lightweight and loads asynchronously, so it does not block page rendering. Umami's tracker is also minimal and asynchronous. Neither tool should have a measurable impact on your Core Web Vitals. If you are running PageSpeed audits, both scripts should be essentially invisible in the waterfall."
    },
    {
      "question": "Why would I pay for Conclick instead of just running Umami for free?",
      "answer": "The short answer is revenue attribution, and not running the server yourself. It is not heatmaps: Umami added its own in 3.2.0, so that stopped being the dividing line. If knowing which UTM campaign drove $3,400 in MRR last month, or which funnel step is quietly costing you the most, changes how you spend your time and budget, Conclick earns back $9/month quickly. If you genuinely only need to know pageviews and referrers and you are comfortable managing hosting, Umami is the sensible free alternative and there is no shame in using it."
    }
  ],
  "sources": [
    {
      "label": "Umami, v3.2.0 release notes (click and scroll heatmaps)",
      "url": "https://github.com/umami-software/umami/releases/tag/v3.2.0"
    },
    {
      "label": "Umami docs, Heatmaps",
      "url": "https://umami.is/docs/heatmaps"
    },
    {
      "label": "Umami docs, Revenue (revenue arrives as tracked event data)",
      "url": "https://umami.is/docs/revenue"
    },
    {
      "label": "Umami docs, Attribution (first-click and last-click models)",
      "url": "https://umami.is/docs/attribution"
    },
    {
      "label": "Umami docs, Funnel",
      "url": "https://umami.is/docs/funnel"
    },
    {
      "label": "Umami docs, Integrations (framework plugins only, no payment processors)",
      "url": "https://umami.is/docs/integrations"
    },
    {
      "label": "Umami Cloud pricing",
      "url": "https://umami.is/pricing"
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
    "headline": "See which traffic actually pays you",
    "sub": "Connect Stripe, Paddle, Polar, Lemon Squeezy or Dodo and Conclick shows revenue by source, campaign and funnel step. Free for 14 days, no card.",
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
        "feature": "Payment-processor connection (Stripe, Paddle, etc.)",
        "conclick": true,
        "competitor": false,
        "note": "Conclick connects 5 processors; Umami attributes revenue but only revenue you send it as event data, per their docs as of July 2026"
      },
      {
        "feature": "Heatmaps with rage/dead clicks, filterable to buyers",
        "conclick": true,
        "competitor": "Click + scroll maps since 3.2.0",
        "note": "Both draw heatmaps over real page content; Conclick adds rage- and dead-click classification and filters the map to visitors who paid"
      },
      {
        "feature": "Auto-detected funnels with revenue lost",
        "conclick": true,
        "competitor": "Basic manual funnels",
        "note": "Umami has manual funnels in the open-source build; no revenue attached"
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
        "note": "Umami has no built-in notification digest, per their docs as of July 2026"
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
