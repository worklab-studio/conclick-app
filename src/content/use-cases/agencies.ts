import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "useCase",
  "slug": "agencies",
  "h1": "Analytics for Agencies: What Client Work Actually Demands",
  "metaTitle": "Analytics for Agencies: Prove Client ROI, Not Pageviews",
  "metaDescription": "Agencies need to show clients which traffic made money, where the funnel breaks, and why. Here's how Conclick's revenue attribution and heatmaps do that.",
  "tldr": "Agencies need to prove that their work generated revenue, not just traffic. Conclick connects client payments directly to campaigns, funnels, and pages — so you can show up to a review meeting with a number, not a chart. It takes about two minutes to install per client site, no consent banners needed, and starts at $9/month.",
  "intro": "I built Conclick for founders who were tired of explaining to themselves why traffic was up but revenue wasn't. Turns out agencies have the same problem, just with an audience: a client sitting across the table who wants to know what they actually got for the retainer. Pageviews don't answer that question. Revenue attribution does.",
  "sections": [
    {
      "type": "h2",
      "text": "What Agencies Actually Need From Analytics",
      "id": "what-agencies-actually-need"
    },
    {
      "type": "p",
      "text": "Most agencies are running Google Analytics on client sites because it's free and clients have heard of it. The problem is that GA4 was designed to answer questions about traffic, not questions about money. You can see that 4,200 people visited the pricing page. You cannot easily see how many of them bought something, which campaign sent them, or what that cohort was worth."
    },
    {
      "type": "p",
      "text": "Agencies need to answer three questions for every client engagement. First: which channels and campaigns are generating actual revenue, not just sessions? Second: where in the funnel is the client losing customers, and how much money is that costing them? Third: is a specific page or CTA working as intended, or are visitors confused by it? Those are the questions that justify a retainer renewal."
    },
    {
      "type": "h3",
      "text": "The Attribution Gap Most Agencies Are Living With",
      "id": "the-attribution-gap"
    },
    {
      "type": "p",
      "text": "Here is what usually happens. An agency runs a paid campaign, organic SEO, and an email sequence for the same client simultaneously. Traffic goes up. Conversions go up. The client asks which channel is responsible. The agency pulls a GA4 report, sees last-click attribution giving all the credit to direct, and starts trying to explain assisted conversions in a slide deck at 11pm before a Thursday call. Everyone leaves the meeting unsatisfied."
    },
    {
      "type": "p",
      "text": "Conclick's revenue attribution works differently. Connect the client's Stripe, Paddle, Polar, Lemon Squeezy, or Dodo account and every payment is tied back to the source, campaign, and funnel step that earned it. Not the last click — the full picture of what traffic actually converted to money. You can walk into a review and say: the SEO content drove $3,200 in new revenue this month. The paid campaign drove $1,100. Email drove $800. That's a conversation, not a defense."
    },
    {
      "type": "h2",
      "text": "Funnel Analysis Without the Configuration Nightmare",
      "id": "funnel-analysis"
    },
    {
      "type": "p",
      "text": "Setting up funnel tracking in GA4 requires either a developer or a significant investment of time in Google Tag Manager. Most agencies do it once at the start of an engagement, then don't touch it when the client's checkout flow changes, and then wonder why the numbers look off six months later."
    },
    {
      "type": "p",
      "text": "Conclick auto-detects funnels. It watches how visitors actually move through the site, identifies the sequences that end in conversion events, and surfaces the single biggest drop-off point along with an estimate of the revenue being lost there. You don't configure a funnel and wait. You log in and see: 67% of users who hit the pricing page are leaving before they reach checkout, and based on average order value, that's roughly $4,800 a month in recoverable revenue. That number gives you something to work on."
    },
    {
      "type": "callout",
      "text": "The most valuable number in any client report isn't conversion rate — it's estimated revenue lost to the biggest drop-off. When you can put a dollar figure on a UX problem, clients fix it. When you show them a percentage, they ask you to make another slide."
    },
    {
      "type": "h2",
      "text": "Heatmaps That Run on Real Screenshots",
      "id": "heatmaps-and-click-maps"
    },
    {
      "type": "p",
      "text": "Most heatmap tools use a DOM reconstruction that approximates what the page looked like. Conclick uses real screenshots as the base layer, so what you see in the heatmap is exactly what the visitor saw — including any A/B test variant, personalization layer, or dynamic content that was live at the time."
    },
    {
      "type": "p",
      "text": "For agencies, this matters when you're diagnosing a problem on a client's landing page and need to show the client where clicks are going. Rage clicks (repeated fast clicks on something that isn't responding) and dead clicks (clicks on elements that aren't interactive but visitors think they should be) show up separately from normal click data. Scroll depth tells you whether visitors are actually reading that long-form sales page or bailing after the hero."
    },
    {
      "type": "p",
      "text": "These aren't things you'd use in every client report. But when a client says the landing page isn't converting and you need to show them why, a real-screenshot heatmap with rage click markers is a concrete answer. It ends the discussion about whether the CTA button placement is a problem."
    },
    {
      "type": "h2",
      "text": "Client Reporting and Team Access",
      "id": "client-reporting"
    },
    {
      "type": "p",
      "text": "Conclick supports team sharing and public dashboards. You can give a client read-only access to their own analytics, or generate a public link to a dashboard that you can embed in a report or send before a meeting. Clients who can see their own data between calls ask better questions. They also stop emailing you to pull screenshots."
    },
    {
      "type": "p",
      "text": "The daily digest — a summary of the past 24 hours with traffic spikes, revenue milestones, and funnel movement — goes out by email and can push to Slack, Discord, or Telegram. If you're managing a client channel in Slack, you can have the digest drop in there each morning. It's a lightweight way to stay visible without writing a weekly update."
    },
    {
      "type": "h2",
      "text": "Privacy, Compliance, and Setup",
      "id": "privacy-and-setup"
    },
    {
      "type": "p",
      "text": "Conclick is cookieless and doesn't fingerprint users. That means most client sites don't need a consent banner for the analytics script alone — one less compliance conversation when onboarding a new client in the EU. The script is lightweight and takes about two minutes to install. There's a Google Search Console integration and GA4 import if the client is coming off Google Analytics and wants to preserve historical data."
    },
    {
      "type": "p",
      "text": "I want to be honest about where Conclick is not the right tool. If a client has a complex enterprise analytics stack, multiple data warehouses, and a team of analysts building custom attribution models, they don't need Conclick — they need a data engineer and BigQuery. Conclick is for small-to-mid-sized SaaS and ecommerce clients who want to understand their business without maintaining infrastructure. That's the audience it was built for."
    },
    {
      "type": "h2",
      "text": "Getting Started for an Agency Client",
      "id": "getting-started"
    },
    {
      "type": "ol",
      "items": [
        "Start a 14-day free trial — no credit card needed. Add the tracking script to the client's site in two minutes.",
        "Connect the client's payment processor (Stripe, Paddle, Polar, Lemon Squeezy, or Dodo) to enable revenue attribution.",
        "Let it run for a few days. Auto-detected funnels and heatmaps start populating once there's enough traffic.",
        "Set up goals and conversions with revenue values for any non-payment conversion events (demo bookings, lead form submits, etc.).",
        "Share a public dashboard link or grant the client read-only access before your next review meeting.",
        "Add the daily digest to your shared Slack channel so the client sees momentum without waiting for a monthly report."
      ]
    }
  ],
  "faq": [
    {
      "question": "Can I manage multiple client sites under one Conclick account?",
      "answer": "Each Conclick site is a separate workspace. You can have multiple sites on one account and switch between them. Pricing is per site, so if you're managing five client sites, that's five subscriptions. At $7/month per site billed yearly, it's a cost you can pass through to clients or absorb as part of a reporting retainer — either way it's not a meaningful line item."
    },
    {
      "question": "How does the revenue attribution actually work — is it last-click or something else?",
      "answer": "Conclick connects your client's payment processor (Stripe, Paddle, Polar, Lemon Squeezy, or Dodo) and ties each payment back to the visitor session and source that started it. The attribution model follows the full session journey rather than just the last click. It's not a multi-touch fractional model like some enterprise tools — it's a clear view of which source and campaign the paying customer came from, which is usually what clients need to make decisions."
    },
    {
      "question": "Do clients need to install a consent banner to use Conclick on their site?",
      "answer": "Usually not. Conclick is cookieless and doesn't track individual users across sessions or devices. Under GDPR and CCPA, anonymous aggregate analytics without persistent identifiers typically don't require consent. That said, your client's legal situation is their own — if they have specific compliance requirements or are in a regulated industry, they should verify with their legal counsel. For most small SaaS and ecommerce sites, the answer is no banner needed."
    },
    {
      "question": "Can we give clients access to their own analytics without giving them access to other clients?",
      "answer": "Yes. Each site workspace is isolated. You can grant a client read-only access to their specific workspace, or generate a public dashboard link for them, without exposing any other client's data. The public dashboard link is useful for sending before a meeting — the client can look at their own numbers without needing an account."
    },
    {
      "question": "How are heatmaps different from tools like Hotjar or Microsoft Clarity?",
      "answer": "The main functional difference is that Conclick uses real screenshots as the base layer for heatmaps rather than a DOM reconstruction. This means the heatmap shows exactly what the visitor saw, including dynamic content, A/B test variants, and live personalization. Hotjar and Clarity are more mature products with larger feature sets — session recordings, for example, are something Conclick doesn't do. If session recordings are critical to a client engagement, that's worth knowing upfront."
    },
    {
      "question": "What if the client's site doesn't have a connected payment processor — is Conclick still useful?",
      "answer": "Yes. Revenue attribution requires a connected payment processor, but the rest of the product works independently: auto-detected funnels, heatmaps, click maps, user journeys, the live visitor map, the daily digest, and goal tracking with manual revenue values. If a client has lead generation goals rather than direct payments, you can assign a revenue value per goal (like a dollar value per demo booked) and still get meaningful ROI metrics without a direct payment integration."
    }
  ],
  "internalLinks": [],
  "relatedTools": [],
  "leadMagnet": {
    "kind": "addWebsite",
    "headline": "Analytics built for Agencies",
    "sub": "See which traffic makes money and where you're losing it. Free for 14 days, no card.",
    "ctaLabel": "Add My Website"
  },
  "datePublished": "2026-06-18",
  "dateModified": "2026-06-18"
};

export default entry;
