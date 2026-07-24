import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "comparison",
  "slug": "pirsch",
  "h1": "Conclick vs Pirsch: Which Analytics Tool Actually Shows You the Money?",
  "metaTitle": "Conclick vs Pirsch: Analytics That Shows Revenue",
  "metaDescription": "Pirsch is clean and privacy-first. Conclick adds revenue attribution, heatmaps, and funnels. Here's an honest breakdown of when each tool wins.",
  "tldr": "Pirsch is a solid, privacy-first analytics tool that does pageviews and basic traffic well. Conclick does all of that and adds revenue attribution, real-screenshot heatmaps, and auto-detected funnels, which makes it the better choice if you need to know which traffic actually converts to money. If you just need clean traffic stats without the revenue layer, Pirsch is genuinely fine.",
  "intro": "I built Conclick because pageview counts stopped meaning anything to me. I had traffic. I had signups. I had no idea which campaign actually made me money last Tuesday, and I had zero clue where in the funnel I was hemorrhaging it. Pirsch is a tool I respect: it is honest, fast, and private. But it answers a different question than the one that keeps founders up at night.",
  "sections": [
    {
      "type": "h2",
      "text": "The Core Difference: Traffic Stats vs Revenue Intelligence",
      "id": "the-core-difference"
    },
    {
      "type": "p",
      "text": "Both tools are cookieless, both skip the [consent-banner theater](/blogs/cookie-banners-killing-your-data), both are lightweight. That table-stakes stuff is solved. The split happens the moment you ask: \"Which source made me $847 last week, and which one sent 400 visitors who bought nothing?\" Pirsch cannot answer that. Conclick was built specifically to answer that."
    },
    {
      "type": "p",
      "text": "Conclick connects to your payment processor (Stripe, Paddle, Polar, Lemon Squeezy, or Dodo) and ties every transaction back to the [UTM campaign](/glossary/utm), referrer, and funnel step that preceded it. You stop optimizing for traffic and start optimizing for revenue-per-visitor. That shift changes which decisions you make."
    },
    {
      "type": "h2",
      "text": "Feature Comparison",
      "id": "feature-comparison"
    },
    {
      "type": "comparisonTable"
    },
    {
      "type": "h2",
      "text": "Where Pirsch Is the Better Choice",
      "id": "where-pirsch-wins"
    },
    {
      "type": "p",
      "text": "Let me be direct: Pirsch has a well-regarded developer API and a clean, no-frills UI that some teams genuinely prefer. If your team is developer-heavy and wants to pipe raw event data into your own pipelines, Pirsch's API-first approach is mature and documented. The interface is minimal by design: no noise, no feature you didn't ask for."
    },
    {
      "type": "p",
      "text": "Pirsch also has a longer track record and a larger community of developers who've used it in production. If you are building a pure content site, a developer docs portal, or any project where revenue attribution is irrelevant, Pirsch does what you need without any overhead. It is also a respectable choice if you are on a team that has already standardized on it and there is no burning reason to switch."
    },
    {
      "type": "p",
      "text": "The honest summary: Pirsch wins on API maturity and developer ergonomics. Conclick wins if revenue context is non-negotiable."
    },
    {
      "type": "h2",
      "text": "Revenue Attribution: The Feature That Changes Decisions",
      "id": "revenue-attribution"
    },
    {
      "type": "p",
      "text": "Here is a real scenario. You run a cold-email campaign and a Twitter thread in the same week. Both send 300 visitors. The cold email converts to $1,200 in new MRR. The Twitter thread converts to $0. Without attribution, you see 600 visitors and feel good about \"traction.\" With Conclick, you kill the Twitter effort and double down on the email sequence. That is the only number that matters."
    },
    {
      "type": "p",
      "text": "Conclick pulls payment events from your processor and matches them to sessions using the same cookieless method it uses for everything else. No extra tags, no third-party cookies. The revenue shows up against the source, the campaign, and the goal that earned it."
    },
    {
      "type": "h2",
      "text": "Heatmaps and Click Maps",
      "id": "heatmaps-and-click-maps"
    },
    {
      "type": "p",
      "text": "Pirsch has no heatmaps as of July 2026. Conclick uses real-page screenshots as the base layer, not a wireframe approximation. You see clicks, scroll depth, rage clicks, and dead clicks overlaid on how your page actually looks. Rage clicks tell you where users are frustrated. Dead clicks tell you what they think is clickable but isn't. Scroll depth tells you whether anyone reads below the fold."
    },
    {
      "type": "p",
      "text": "For landing page optimization, pricing page testing, or onboarding flow diagnosis, this is information you simply cannot get from a traffic chart. It is the difference between knowing \"the pricing page has a high bounce rate\" and knowing \"73% of users never scroll past the plan cards and 40 people rage-clicked the FAQ toggle last week.\""
    },
    {
      "type": "h2",
      "text": "Funnels: Auto-Detected, Revenue-Weighted",
      "id": "funnels-and-drop-off"
    },
    {
      "type": "p",
      "text": "Pirsch has limited funnel functionality. Conclick [auto-detects funnels](/guides/how-to-read-a-funnel) from your actual traffic patterns and surfaces the single biggest drop-off, with the revenue lost to that drop-off attached. You don't spend an afternoon configuring funnel steps. The tool finds where you're bleeding and puts a dollar figure on it."
    },
    {
      "type": "p",
      "text": "Goals and conversions also carry revenue per goal. So if your trial-to-paid conversion is a goal, you see not just the conversion rate but the average revenue attached to each conversion path."
    },
    {
      "type": "callout",
      "text": "The question analytics should answer isn't \"how many people visited?\" It's \"which traffic made money, and where did the rest leave?\" Pageview counts are a proxy. Revenue is the actual signal."
    },
    {
      "type": "h2",
      "text": "Daily Digest and Spike Alerts",
      "id": "daily-digest-and-alerts"
    },
    {
      "type": "p",
      "text": "Conclick sends a daily digest by email and to Slack, Discord, or Telegram. It is written in plain language: spikes, milestones, the biggest mover. It is the kind of update you'd read over coffee without opening a dashboard. Pirsch does not offer an equivalent digest as of July 2026."
    },
    {
      "type": "h2",
      "text": "Pricing",
      "id": "pricing"
    },
    {
      "type": "p",
      "text": "Conclick is $9/month or $7/month billed yearly. There is a 14-day free trial with no card required. There is also a one-time lifetime deal for founders who prefer to own rather than subscribe. Pirsch has its own pricing tier structure. For a bootstrapped team, the Conclick price is straightforward, and the free trial is genuinely no-friction."
    },
    {
      "type": "h2",
      "text": "Setup, Privacy, and the Basics",
      "id": "setup-and-privacy"
    },
    {
      "type": "p",
      "text": "Both tools are cookieless. Both are GDPR and CCPA-friendly in the sense that neither sets tracking cookies that require consent. Conclick's script is lightweight and typically takes about two minutes to install. Both tools avoid the consent banner overhead that comes with GA4-style tracking."
    },
    {
      "type": "p",
      "text": "Conclick also includes Google Search Console integration and GA4 data import, team sharing, and public dashboards. If you're migrating away from GA4, the import means you don't lose historical context."
    },
    {
      "type": "h2",
      "text": "Who Should Use What",
      "id": "who-should-use-what"
    },
    {
      "type": "ul",
      "items": [
        "You run a SaaS or ecommerce business and need to know which campaigns generate revenue, not just clicks: use Conclick.",
        "You want heatmaps and scroll depth without a separate Hotjar subscription: use Conclick.",
        "You want auto-detected funnels that show revenue lost at each drop-off: use Conclick.",
        "You run a developer tool, content site, or docs portal where payment attribution is irrelevant and you want a mature API: Pirsch is a fair choice.",
        "You are already using Pirsch and traffic stats are sufficient for your decisions: no urgent reason to switch unless you hit a question Pirsch can't answer."
      ]
    }
  ],
  "faq": [
    {
      "question": "Does Conclick require cookies or a consent banner?",
      "answer": "No. Conclick is cookieless by design, which means it doesn't set any tracking cookies that would trigger GDPR or CCPA consent requirements in most jurisdictions. You skip the consent banner overhead and still get accurate data. The same is true of Pirsch; both tools solved this problem correctly."
    },
    {
      "question": "How does Conclick revenue attribution actually work?",
      "answer": "You connect your payment processor (Stripe, Paddle, Polar, Lemon Squeezy, or Dodo) and Conclick maps each payment event back to the visitor session that preceded it. It uses the same cookieless session tracking it uses for all traffic, so there's no extra tagging or third-party cookies involved. The result is a revenue figure attached to each source, campaign, and funnel path, not just a conversion count."
    },
    {
      "question": "Can I import my existing Google Analytics data into Conclick?",
      "answer": "Yes. Conclick supports GA4 data import so you don't lose historical context when you switch. It also integrates with Google Search Console, so you can see search performance alongside your on-site analytics in the same place."
    },
    {
      "question": "Is Pirsch better than Conclick for developers?",
      "answer": "Pirsch has a mature, well-documented API that developer-focused teams value. If your primary use case involves piping raw event data into custom pipelines or building on top of the analytics programmatically, Pirsch's API-first design is a genuine advantage. Conclick is stronger on the product and revenue intelligence side (heatmaps, attribution, funnels) and is aimed more at the founder making growth decisions than the engineer integrating raw data."
    },
    {
      "question": "What payment processors does Conclick support for revenue attribution?",
      "answer": "Conclick connects to Stripe, Paddle, Polar, Lemon Squeezy, and Dodo. Those cover the processors most common among bootstrapped SaaS and small ecommerce businesses. If you use one of those, you can have attribution running within your first session."
    },
    {
      "question": "How long does Conclick take to set up?",
      "answer": "The analytics script typically takes about two minutes to install: paste one line into your site's HTML and you're collecting data. Connecting a payment processor takes a few more minutes depending on which processor you use. The free trial starts immediately with no card required, so the barrier to seeing real data is genuinely low."
    }
  ],
  "internalLinks": [
    {
      "href": "/vs/plausible",
      "label": "Conclick vs Plausible",
      "group": "comparison"
    },
    {
      "href": "/glossary/cookieless-analytics",
      "label": "What is cookieless analytics?",
      "group": "glossary"
    },
    {
      "href": "/guides/revenue-attribution-tools",
      "label": "Revenue attribution tools compared",
      "group": "guide"
    }
  ],
  "relatedTools": [
    "utm-builder"
  ],
  "leadMagnet": {
    "kind": "addWebsite",
    "headline": "See what Pirsch can't show you",
    "sub": "Add your site and Conclick shows which traffic actually makes money: heatmaps, funnels, and revenue in one dashboard. Free for 14 days, no card.",
    "ctaLabel": "Add My Website"
  },
  "datePublished": "2026-06-18",
  "dateModified": "2026-07-22",
  "comparison": {
    "competitor": "Pirsch",
    "competitorUrl": "https://pirsch.io",
    "rows": [
      {
        "feature": "Cookieless tracking",
        "conclick": true,
        "competitor": true,
        "note": "Both handle this well"
      },
      {
        "feature": "Revenue attribution",
        "conclick": true,
        "competitor": false,
        "note": "Stripe, Paddle, Polar, LS, Dodo"
      },
      {
        "feature": "Heatmaps & click maps",
        "conclick": true,
        "competitor": false,
        "note": "Real-screenshot base layer"
      },
      {
        "feature": "Funnels",
        "conclick": "Auto-detected",
        "competitor": "Limited",
        "note": "Conclick surfaces revenue lost"
      },
      {
        "feature": "Developer API",
        "conclick": "Basic",
        "competitor": "Mature",
        "note": "Pirsch wins here"
      },
      {
        "feature": "Daily digest (email/Slack)",
        "conclick": true,
        "competitor": false,
        "note": "Spike alerts + milestones"
      },
      {
        "feature": "Google Search Console",
        "conclick": true,
        "competitor": false
      },
      {
        "feature": "Free trial (no card)",
        "conclick": "14 days",
        "competitor": "30 days",
        "note": "Pirsch trial is longer"
      },
      {
        "feature": "Lifetime deal option",
        "conclick": true,
        "competitor": false
      }
    ]
  }
};

export default entry;
