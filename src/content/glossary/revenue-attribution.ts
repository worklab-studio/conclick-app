import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "glossary",
  "slug": "revenue-attribution",
  "h1": "Revenue Attribution: What It Is and Why Most Analytics Gets It Wrong",
  "metaTitle": "Revenue Attribution: Definition, Models & How to Do It Right",
  "metaDescription": "Revenue attribution connects your actual payments back to the traffic source, campaign, or funnel that earned them. What it means and how to measure it right.",
  "tldr": "Revenue attribution is the practice of crediting a specific marketing source, channel, or touchpoint with the revenue it generated, not just the clicks or signups. It answers the one question pageviews and conversion rates cannot: which traffic actually makes money?",
  "intro": "Pageviews are vanity. Signups are vanity. The only number that tells you whether your marketing is working is revenue, and specifically which source, campaign, or channel produced it. Revenue attribution is how you connect those dots. Without it, you are spending money on channels that feel productive but cannot prove they pay.",
  "sections": [
    {
      "type": "h2",
      "text": "What Revenue Attribution Actually Means",
      "id": "what-is-revenue-attribution"
    },
    {
      "type": "p",
      "text": "Revenue attribution is the process of assigning monetary credit to the marketing touchpoints that influenced a purchase. At its simplest: someone clicks a Google ad, lands on your pricing page, signs up for a trial, and pays you $49. Revenue attribution says that $49 belongs to Google Ads, campaign X, keyword Y. At its most complex, a customer touches six channels over three weeks before converting, and you have to decide how to split the credit."
    },
    {
      "type": "p",
      "text": "The key word is 'revenue': not visits, not leads, not trial signups. Revenue attribution requires your analytics to actually know what payments happened and for how much. That means connecting your payment processor (Stripe, Paddle, Lemon Squeezy, Polar, Dodo Payments, etc.) to your analytics layer. Most tools stop at the signup event. That gap is where bad marketing decisions get made."
    },
    {
      "type": "h2",
      "text": "Attribution Models: How Credit Gets Assigned",
      "id": "attribution-models"
    },
    {
      "type": "p",
      "text": "Every attribution system has to decide how to split credit across touchpoints. The main models:"
    },
    {
      "type": "ul",
      "items": [
        "First-touch: 100% of credit goes to the first source that brought the visitor. Good for measuring what starts conversations. Terrible for measuring what closes them.",
        "Last-touch: 100% of credit goes to the channel the visitor came from immediately before converting. The default in most tools. Systematically over-credits branded search and direct traffic.",
        "Linear: Credit is split equally across every touchpoint. Treats a 3-second bounce from an ad the same as 20 minutes on your docs. Not realistic, but honest about multi-channel journeys.",
        "Time-decay: More recent touchpoints get more credit. Reasonable for short sales cycles where the final push matters most.",
        "Position-based (U-shaped): First and last touch each get 40%, the rest share 20%. A common compromise for SaaS with a meaningful discovery-plus-decision journey.",
        "Data-driven: Credit is allocated based on statistical modeling of which touchpoints actually correlate with conversion in your data. Requires volume. Google Ads uses this internally and does not let you audit it."
      ]
    },
    {
      "type": "p",
      "text": "For bootstrapped SaaS and small ecommerce, the honest answer is: first-touch and last-touch together tell you most of what you need. First-touch tells you what acquired the customer. Last-touch tells you what tipped them. If you have a 14-day trial, the conversion gap between those two is almost always where you should focus your product work, not your ad spend."
    },
    {
      "type": "h2",
      "text": "Why Revenue Attribution Is the Only Metric That Pays",
      "id": "why-it-matters"
    },
    {
      "type": "p",
      "text": "Consider two traffic sources. Source A sends 2,000 visitors a month, converts 4% to trial, and 8% of those pay. Source B sends 400 visitors, converts 6% to trial, and 30% pay. On a traffic dashboard, Source A looks like your best channel. On a revenue dashboard, Source B is generating nearly triple the revenue per visitor."
    },
    {
      "type": "p",
      "text": "This is not a contrived example. It is what almost every SaaS founder finds when they finally connect payment data to acquisition data. The channel that looks quietest is often the one worth doubling down on. The one that feels like it is working is often buying low-intent window shoppers who trial and churn."
    },
    {
      "type": "callout",
      "text": "Traffic that does not convert to revenue is not an asset. It is a cost. Attribution is the difference between [knowing your marketing ROI](/blog/why-revenue-attribution-matters) and guessing it."
    },
    {
      "type": "p",
      "text": "Revenue attribution also changes how you think about your funnel. Once you know which source produces paying customers, you can ask: where in the funnel are those customers dropping out? A source with a high trial-to-paid rate might be leaking on a specific pricing tier, or on annual vs. monthly billing, or on a particular landing page. You cannot diagnose that without tying revenue back to source and tracking both together."
    },
    {
      "type": "h2",
      "text": "How to Actually Measure Revenue Attribution",
      "id": "how-to-measure"
    },
    {
      "type": "h3",
      "text": "Step 1: Tag your traffic consistently",
      "id": "step-1-utms"
    },
    {
      "type": "p",
      "text": "UTM parameters (utm_source, utm_medium, utm_campaign, utm_content) are the standard way to label traffic. Every paid campaign should use them. Every newsletter link should use them. Without consistent UTM discipline, you are attributing revenue to 'direct' and 'organic' by default, which means no signal at all."
    },
    {
      "type": "h3",
      "text": "Step 2: Persist the source through signup",
      "id": "step-2-persist-source"
    },
    {
      "type": "p",
      "text": "The UTM is in the URL when someone lands. By the time they pay, days or weeks later, that URL is gone. Your analytics tool has to capture and store that first-touch source against the user identity, then carry it through to the payment event. This is where most lightweight analytics tools fail. They track pageviews. They do not connect a pageview to a Stripe charge."
    },
    {
      "type": "h3",
      "text": "Step 3: Connect your payment processor",
      "id": "step-3-connect-payments"
    },
    {
      "type": "p",
      "text": "The actual revenue data has to come in from your payment processor via webhook or API. When a customer pays, your analytics system matches that payment to the user record and therefore to the acquisition source. This requires either a [native integration](/guides/revenue-attribution-tools) between your analytics tool and your payment processor, or custom event tracking where you send a revenue event from your backend."
    },
    {
      "type": "h3",
      "text": "Step 4: Report on revenue by source, not just conversions",
      "id": "step-4-report"
    },
    {
      "type": "p",
      "text": "The output you want is a table: source, visitors, trials, paid conversions, total revenue, average revenue per visitor. Sort by revenue, not by conversion rate. Make decisions from that table."
    },
    {
      "type": "h2",
      "text": "Common Mistakes in Revenue Attribution",
      "id": "common-mistakes"
    },
    {
      "type": "ul",
      "items": [
        "Trusting 'direct' traffic at face value. A large direct segment usually means UTM tracking is broken, ad links are missing parameters, or your tool is not capturing referrers correctly. Audit before concluding that direct traffic is your best channel.",
        "Treating MRR and one-time revenue the same. A source that drives annual plan buyers is worth far more than one that drives monthly subscribers, even at the same conversion rate. Segment by revenue amount, not just conversion event.",
        "Ignoring churn by source. Some acquisition channels produce customers who cancel in month two. Revenue attribution at the signup event misses this. If you can tag customers by source and track their retention, you will find that some 'good' channels produce terrible LTV.",
        "Letting sampling and ad platform data override first-party data. Google Ads will tell you its campaigns drove X revenue. That number is modeled and often inflated. Your own first-party data, where you match [your own payment records](/guides/stripe-revenue-vs-analytics-revenue) to your own tracking, is the only number worth trusting for budget decisions.",
        "Not accounting for the trial gap. For SaaS with a free trial, the acquisition channel that starts the trial may look weak if you only look at immediate conversions. Give the attribution window enough time to capture the trial-to-paid lag."
      ]
    },
    {
      "type": "h2",
      "text": "How Conclick Handles Revenue Attribution",
      "id": "conclick"
    },
    {
      "type": "p",
      "text": "Conclick connects directly to Stripe, Paddle, Polar, Lemon Squeezy, and Dodo Payments and ties every payment back to the source, campaign, and funnel that earned it: without cookies, without a consent banner in most jurisdictions, and without needing a developer to wire up custom events. It also surfaces auto-detected funnels with the revenue lost at each drop-off point, so you can see not just which source earns the most but exactly where customers from that source are abandoning. For bootstrapped founders who want to know where their money actually comes from, it is a practical alternative to stitching together GA4, Stripe dashboards, and a spreadsheet."
    }
  ],
  "faq": [
    {
      "question": "What is the difference between revenue attribution and conversion tracking?",
      "answer": "Conversion tracking records that an event happened: a signup, a form submit, a trial start. Revenue attribution assigns a dollar amount to the source that drove that event. Conversion tracking tells you what happened. Revenue attribution tells you what it was worth. You need both, but revenue attribution is the one that tells you where to spend your marketing budget."
    },
    {
      "question": "Which attribution model should I use for SaaS?",
      "answer": "For most small SaaS businesses, first-touch attribution for acquisition analysis and last-touch attribution for conversion analysis is the practical starting point. First-touch tells you which channels discover customers; last-touch tells you what closes them. If you have enough data and a complex multi-channel journey, a position-based (U-shaped) model is a reasonable middle ground. Data-driven models require significant conversion volume (typically thousands of paid conversions) before they are statistically meaningful."
    },
    {
      "question": "Do I need UTM parameters for revenue attribution to work?",
      "answer": "UTM parameters are the most reliable way to tag paid and owned traffic for attribution. Without them, traffic from campaigns lands as 'direct' or with a bare referrer domain, and you lose the campaign-level detail that makes attribution actionable. Organic and referral traffic can be attributed without UTMs using the HTTP referrer, but for any traffic you are paying for, consistent UTM tagging is non-negotiable."
    },
    {
      "question": "Why does my Google Analytics revenue attribution differ from my Stripe revenue?",
      "answer": "Several reasons: GA4 uses sampled data and modeled conversions; Stripe reports actual settled charges. GA4 session attribution can mis-credit sources if a user switches devices or browsers. GA4 also does not know about refunds, disputes, or failed payments unless you send those events explicitly. Your Stripe revenue number is ground truth. Your GA4 revenue attribution is a model. Use GA4 to understand directionality and prioritize channels, but reconcile against actual payment processor data for any business decision."
    },
    {
      "question": "How does revenue attribution work for subscription businesses with a free trial?",
      "answer": "The attribution window has to cover the full trial period plus conversion lag. If your trial is 14 days and some customers take a few extra days to convert, a 21-day attribution window typically captures most conversions. The source that started the trial gets credited when the first payment fires. You should also track churn by acquisition source over time; a source with a high trial-to-paid rate but 60% churn in month three is not as good as it looks on the conversion dashboard."
    },
    {
      "question": "Can I do revenue attribution without third-party cookies?",
      "answer": "Yes. First-party attribution (where your own analytics script reads UTM parameters from the landing URL, stores them in a first-party cookie or localStorage, and passes them through to your signup and payment events) does not require third-party cookies at all. This approach is more durable than third-party tracking and is fully compatible with privacy regulations like GDPR and CCPA. The limitation is cross-device attribution: if a customer discovers you on mobile and converts on desktop, first-party attribution will miss the link unless they are logged in across both sessions."
    }
  ],
  "internalLinks": [
    {
      "href": "/guides/revenue-attribution-tools",
      "label": "Revenue Attribution Tools Compared",
      "group": "guide"
    },
    {
      "href": "/guides/stripe-revenue-vs-analytics-revenue",
      "label": "Stripe Revenue vs Analytics Revenue",
      "group": "guide"
    },
    {
      "href": "/blog/why-revenue-attribution-matters",
      "label": "Why Revenue Attribution Matters",
      "group": "blog"
    }
  ],
  "relatedTools": [],
  "leadMagnet": {
    "kind": "addWebsite",
    "headline": "Measure this automatically",
    "sub": "Conclick tracks this out of the box, alongside heatmaps, funnels, and revenue attribution. Free for 14 days, no card.",
    "ctaLabel": "Add My Website"
  },
  "datePublished": "2026-06-18",
  "dateModified": "2026-07-22"
};

export default entry;
