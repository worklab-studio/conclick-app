import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "alternative",
  "slug": "umami",
  "h1": "The Best Umami Alternatives in 2026",
  "metaTitle": "Best Umami Alternatives in 2026 (Ranked)",
  "metaDescription": "Tired of self-hosting Umami? Here are the best alternatives in 2026: privacy-first, no-cookie, and actually useful for bootstrapped SaaS founders.",
  "tldr": "The best Umami alternatives in 2026 are Conclick (best for revenue attribution and heatmaps), Plausible (best simple hosted option), and Fathom (best for compliance-heavy teams). If you want to know which traffic actually makes you money, not just which pages get clicks, Conclick is the one to start with.",
  "intro": "I've been self-hosting Umami for the better part of two years. It's fine. Cookieless, fast, open source. But somewhere around month six I realized I had a beautiful dashboard telling me my blog post got 3,400 pageviews, and absolutely no idea whether any of those visitors ever paid me anything. That's the gap Umami doesn't close. Full disclosure before we start: Conclick, the first pick below, is my product, and it started as a fork of Umami, so I know its codebase from the inside. If all you need is \"how many people visited my site,\" Umami is perfectly adequate. But if you're a bootstrapped founder trying to figure out which ad, which SEO article, or which cold email sequence is actually generating revenue, you need something different. Here's an honest look at what's worth switching to in 2026.",
  "sections": [
    {
      "type": "h2",
      "text": "1. Conclick: Best for Revenue Attribution and Heatmaps",
      "id": "conclick"
    },
    {
      "type": "p",
      "text": "Conclick is where I landed after Umami, and it's the tool I'd recommend to most bootstrapped founders. The core pitch: it connects your analytics to your actual revenue. You plug in Stripe, Paddle, Polar, Lemon Squeezy, or Dodo, and Conclick [ties every payment back](/glossary/revenue-attribution) to its source: campaign, funnel step, referrer, whatever. So instead of \"blog post got 3,400 visitors,\" you see \"blog post drove $1,200 in MRR this month.\" That's a different conversation entirely."
    },
    {
      "type": "p",
      "text": "The heatmaps are the other thing that surprised me. Not placeholder heatmaps overlaid on a generic wireframe. Real screenshots of your actual page, with click density, rage clicks, dead clicks, and scroll depth mapped on top. If you've ever stared at your pricing page wondering why people aren't clicking the CTA, this answers it quickly."
    },
    {
      "type": "p",
      "text": "Conclick also auto-detects funnels. You don't have to manually define conversion paths; it surfaces the biggest drop-off points in your [revenue funnel](/glossary/conversion-funnel) on its own. Combined with visual user journeys and a live global visitor map, you get a picture of your users that's genuinely useful for making product and marketing decisions, not just for impressing investors."
    },
    {
      "type": "ul",
      "items": [
        "Revenue attribution: connects Stripe, Paddle, Polar, Lemon Squeezy, Dodo to every traffic source",
        "Real-screenshot heatmaps with rage clicks, dead clicks, scroll depth",
        "Auto-detected funnels showing your biggest revenue drop-off",
        "Daily digest via email, Slack, Discord, or Telegram",
        "GSC and GA4 import so you don't lose historical data",
        "Cookieless, GDPR/CCPA-friendly, [usually no consent banner needed](/guides/gdpr-analytics-checklist) (Conclick stores a first-party id in localStorage; whether that needs consent depends on your jurisdiction)",
        "~2-minute setup",
        "$9/month, $7/month billed yearly, 14-day free trial with no card required, optional lifetime plan"
      ]
    },
    {
      "type": "p",
      "text": "The daily digest is a small thing that ends up mattering. Every morning you get a summary of yesterday (revenue, top sources, notable movements) in email or whatever channel you're already in. I've found it's the nudge that keeps me actually looking at my analytics instead of ignoring them for three weeks."
    },
    {
      "type": "p",
      "text": "Who it's for: bootstrapped founders and small SaaS or ecommerce teams who want to connect traffic to money. If you don't have a payment processor integration, some of the best features don't apply to you yet, though the heatmaps and funnels still stand on their own."
    },
    {
      "type": "comparisonTable"
    },
    {
      "type": "h2",
      "text": "2. Plausible: Best Simple Hosted Option",
      "id": "plausible"
    },
    {
      "type": "p",
      "text": "Plausible is the obvious first alternative most people consider when leaving Umami, and for good reason. It's polished, honest, and genuinely easy to use. The dashboard is clean to the point of being spartan: pageviews, unique visitors, bounce rate, top sources, top pages. No clutter. If your use case is \"I want to see traffic numbers without self-hosting a database,\" Plausible is a solid answer."
    },
    {
      "type": "p",
      "text": "Pricing starts at $9/month for up to 10,000 monthly pageviews, scaling from there. It's EU-hosted, open source (AGPL), and cookieless. Where it falls short: no revenue attribution, no heatmaps, no funnel detection. It's a traffic tool, not a revenue tool. That's a deliberate product choice, not a flaw, but know what you're buying."
    },
    {
      "type": "p",
      "text": "Best for: content sites, personal projects, or anyone who genuinely only needs clean traffic reporting and wants to stop maintaining a self-hosted instance."
    },
    {
      "type": "h2",
      "text": "3. Fathom: Best for Compliance-Heavy Teams",
      "id": "fathom"
    },
    {
      "type": "p",
      "text": "Fathom is where Plausible's compliance story gets taken up another level. They've invested heavily in EU isolation (they call it EU Isolation, and it's their main differentiator), which matters if you're serving European users and have a legal team asking hard questions. They also have a long track record (one of the original cookieless analytics tools) and a genuinely responsive support team."
    },
    {
      "type": "p",
      "text": "Pricing starts at $15/month for 100,000 monthly pageviews, which is higher than Plausible or Conclick. The dashboard is similar in scope to Plausible: clean, traffic-focused, no revenue data, no heatmaps. Like Plausible, it's a deliberate product: no feature bloat, just solid traffic numbers with strong privacy credentials."
    },
    {
      "type": "p",
      "text": "Best for: agencies, compliance-sensitive SaaS teams, or anyone whose primary concern is airtight EU data handling rather than revenue insight."
    },
    {
      "type": "h2",
      "text": "4. Pirsch: Best Budget Hosted Option",
      "id": "pirsch"
    },
    {
      "type": "p",
      "text": "Pirsch is less talked about than Plausible or Fathom, which is a shame because the value is real. It's a privacy-friendly hosted analytics tool built by a small team, with a free tier for one domain and paid plans starting around $6/month. The dashboard covers the essentials (pageviews, sessions, referrers, conversions) and the setup is fast."
    },
    {
      "type": "p",
      "text": "It has basic conversion tracking, which puts it slightly ahead of pure traffic tools, but there's no payment processor integration, no heatmaps, and the ecosystem is smaller than Plausible's. The GitHub repo is active and the pricing is competitive. If budget is a primary constraint and you want a hosted, privacy-first option with slightly more than just raw traffic numbers, Pirsch deserves a look."
    },
    {
      "type": "p",
      "text": "Best for: solo founders or very early-stage teams who want hosted analytics at the lowest possible price point."
    },
    {
      "type": "h2",
      "text": "5. GoatCounter: Best Free Self-Hosted Option",
      "id": "goatcounter"
    },
    {
      "type": "p",
      "text": "GoatCounter is the most minimal tool on this list, by design. It's open source, self-hostable, and has a hosted free tier for non-commercial use (paid for commercial). The interface is about as stripped down as analytics gets: page paths, referrers, browsers, countries. That's roughly it."
    },
    {
      "type": "p",
      "text": "If you're coming from Umami and the main thing you want is to escape the self-hosting overhead while spending nothing, GoatCounter's hosted free tier covers personal or side projects. For anything commercial at scale, the paid tier is fair but the feature gap versus Conclick or even Plausible is large. No funnels, no heatmaps, no revenue data."
    },
    {
      "type": "p",
      "text": "Best for: developers, personal sites, and open-source projects that need the absolute minimum viable analytics with zero cost."
    },
    {
      "type": "h2",
      "text": "Which One Should You Actually Pick?",
      "id": "which-to-pick"
    },
    {
      "type": "p",
      "text": "Here's the honest version: if you're a bootstrapped founder with a payment processor and you want to know which traffic sources are making you money, start with Conclick. The 14-day trial requires no card, setup is two minutes, and the revenue attribution features have no real equivalent in the other tools here."
    },
    {
      "type": "p",
      "text": "If you just want clean traffic numbers in a hosted product without thinking about it, Plausible is the standard choice and it's good at what it does. Fathom if compliance is your primary concern. Pirsch if budget is tight. GoatCounter if you're non-commercial or want something free and extremely minimal."
    },
    {
      "type": "p",
      "text": "Umami is a perfectly reasonable tool to stay on if you're happy self-hosting and traffic data is all you need. But if you're reading a roundup of alternatives, you probably want more than that."
    }
  ],
  "faq": [
    {
      "question": "Is Conclick a good replacement for Umami?",
      "answer": "Yes, especially if you want revenue attribution and heatmaps. Umami gives you traffic data; Conclick connects that traffic to actual payments via Stripe, Paddle, Polar, Lemon Squeezy, and Dodo. Setup is about 2 minutes and there's a 14-day free trial with no card required."
    },
    {
      "question": "Do any of these alternatives require a cookie consent banner?",
      "answer": "Conclick, Plausible, Fathom, Pirsch, and GoatCounter are all cookieless. In most cases you won't need a consent banner for the analytics script itself, though you should verify with your own legal counsel based on your specific use case and user location."
    },
    {
      "question": "Which Umami alternative is best for ecommerce?",
      "answer": "Conclick is the strongest option for ecommerce because it directly integrates with payment processors (Stripe, Paddle, Polar, Lemon Squeezy, Dodo) and ties revenue back to traffic sources, campaigns, and funnel steps. The others are primarily traffic tools without native revenue data."
    },
    {
      "question": "Can I migrate my historical data from Umami?",
      "answer": "Conclick supports importing from Google Search Console and GA4, so you can bring in historical search and traffic data. For raw Umami event data, you'd need to export it manually as Umami uses its own database schema."
    },
    {
      "question": "What is the cheapest hosted Umami alternative?",
      "answer": "GoatCounter has a free tier for non-commercial use. Among paid options, Pirsch starts around $6/month and Conclick is $9/month (or $7/month billed annually). Plausible starts at $9/month and Fathom at $15/month."
    },
    {
      "question": "Do these tools work without self-hosting?",
      "answer": "Conclick, Plausible, Fathom, Pirsch, and GoatCounter (hosted tier) are all fully managed, so you never touch a server. Umami and GoatCounter are also self-hostable if you prefer to own your infrastructure. Conclick does not offer a self-hosted option."
    }
  ],
  "internalLinks": [
    {
      "href": "/vs/umami",
      "label": "Conclick vs Umami: the full head-to-head",
      "group": "comparison"
    },
    {
      "href": "/glossary/revenue-attribution",
      "label": "Revenue attribution, defined",
      "group": "glossary"
    },
    {
      "href": "/guides/gdpr-analytics-checklist",
      "label": "GDPR analytics checklist",
      "group": "guide"
    },
    {
      "href": "/glossary/conversion-funnel",
      "label": "What a conversion funnel is",
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
  "datePublished": "2026-06-22",
  "dateModified": "2026-07-22",
  "comparison": {
    "competitor": "Umami",
    "competitorUrl": "https://umami.is",
    "rows": [
      {
        "feature": "Cookieless / usually no consent banner",
        "conclick": true,
        "competitor": true,
        "note": "Both are cookieless and GDPR/CCPA-friendly; banner requirements depend on your jurisdiction"
      },
      {
        "feature": "Hosted (no self-hosting required)",
        "conclick": true,
        "competitor": false,
        "note": "Umami is self-hosted; Conclick is fully managed"
      },
      {
        "feature": "Revenue attribution (Stripe, Paddle, etc.)",
        "conclick": true,
        "competitor": false,
        "note": "Conclick connects payments to traffic sources; Umami has no payment integrations as of July 2026"
      },
      {
        "feature": "Real-screenshot heatmaps + click maps",
        "conclick": true,
        "competitor": false,
        "note": "Conclick shows actual page screenshots with rage/dead click overlays; Umami has none"
      },
      {
        "feature": "Auto-detected funnels",
        "conclick": true,
        "competitor": false,
        "note": "Conclick surfaces revenue drop-off automatically; Umami requires manual funnel setup"
      },
      {
        "feature": "Daily digest (email + Slack/Discord/Telegram)",
        "conclick": true,
        "competitor": false,
        "note": "Conclick sends proactive summaries; Umami is dashboard-only"
      },
      {
        "feature": "Open source / self-hostable",
        "conclick": false,
        "competitor": true,
        "note": "Umami wins here: MIT licensed, full control over your data and infrastructure"
      },
      {
        "feature": "GSC + GA4 import",
        "conclick": true,
        "competitor": false,
        "note": "Conclick imports historical data from Google tools; Umami does not"
      },
      {
        "feature": "Pricing (starting)",
        "conclick": "$9/mo ($7 yearly), 14-day trial no card",
        "competitor": "Free (self-hosted, but you pay for infra)",
        "note": "Umami is free if you host it yourself; Conclick is paid but removes all ops overhead"
      }
    ]
  }
};

export default entry;
