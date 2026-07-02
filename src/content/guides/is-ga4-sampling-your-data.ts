import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "is-ga4-sampling-your-data",
  "h1": "Is GA4 Sampling Your Data? How to Tell and What to Do",
  "metaTitle": "Is GA4 Sampling Your Data? How to Tell",
  "metaDescription": "GA4 samples data in Explorations above ~10M events. Here's how to spot it, which reports are affected, and your real options to get accurate numbers.",
  "tldr": "GA4 samples data in Explorations once your property crosses roughly 10 million events in the date range you query — and it does so silently, with a small icon most people miss. Standard reports (Acquisition, Engagement, Monetization) are unsampled, but the moment you build a custom Exploration, you may be looking at estimates, not facts. The fix depends on your budget: free tier users can shorten date ranges or switch to BigQuery export; GA4 360 users get higher thresholds; everyone else should consider whether a second, purpose-built analytics tool covers the queries they actually run day to day.",
  "intro": "GA4 has a sampling problem it does not advertise loudly. I spent an embarrassing amount of time optimizing a funnel based on Exploration data, only to notice the shield icon and realize I was working from a 72% sample. Here is everything I wish someone had told me plainly.",
  "sections": [
    {
      "type": "h2",
      "text": "What sampling actually means in GA4",
      "id": "what-sampling-means-in-ga4"
    },
    {
      "type": "p",
      "text": "Sampling means GA4 analyzed a subset of your events and extrapolated the results to represent the whole. It is not inherently evil — statistical sampling works fine at scale for broad trends. The problem is that conversion funnels, cohort analysis, and segment-level breakdowns are precisely the queries where you need exact numbers, and those are exactly the queries GA4 runs through its sampled Explorations engine."
    },
    {
      "type": "p",
      "text": "GA4 has two distinct reporting surfaces. Standard reports — the Acquisition, Engagement, and Monetization tabs — run on pre-aggregated data and are not sampled. Explorations — Funnel exploration, Path exploration, Cohort exploration, Segment overlap — query raw event data and hit the sampling threshold. That distinction matters more than almost anything else in this article."
    },
    {
      "type": "h2",
      "text": "How to tell if your data is being sampled right now",
      "id": "how-to-tell-if-your-data-is-sampled"
    },
    {
      "type": "p",
      "text": "Open any Exploration in GA4. Look at the top right of the canvas. You will see either a green shield icon (unsampled) or a yellow/orange shield (sampled). Click it. GA4 will tell you the exact percentage of sessions it analyzed — something like 'Based on 68.3% of sessions for this date range.' That number is the signal. Anything below 100% means your report is an estimate."
    },
    {
      "type": "p",
      "text": "The threshold that triggers sampling is approximately 10 million events within the queried date range for a standard GA4 property. This sounds like a lot, but it is not. A mid-size SaaS product with page views, scroll events, click events, and custom events can easily generate 10 million events per month. A 90-day funnel analysis on such a property will almost always be sampled."
    },
    {
      "type": "h3",
      "text": "Common signs you are working from bad numbers",
      "id": "common-signs-you-are-working-from-bad-numbers"
    },
    {
      "type": "ul",
      "items": [
        "Your funnel conversion rates shift noticeably when you change the date range by a few days — sampling percentage changes, so the estimate changes.",
        "Segment comparisons in Explorations show suspiciously round numbers or inconsistencies with what your standard reports show.",
        "A cohort analysis shows patterns that do not match your gut check from revenue data or other sources.",
        "You add a breakdown dimension to an Exploration and the totals no longer match the top-level number."
      ]
    },
    {
      "type": "h2",
      "text": "Which GA4 reports are safe to trust",
      "id": "which-ga4-reports-are-safe"
    },
    {
      "type": "p",
      "text": "Standard reports are built on pre-aggregated tables that GA4 computes continuously. Acquisition overview, traffic source breakdown, page and screen views, user counts, basic conversion events — these are not sampled regardless of your event volume. If you need to answer 'how much organic traffic did we get last month,' the standard reports are accurate."
    },
    {
      "type": "p",
      "text": "The problem starts the moment you need to ask 'what percentage of users who came from paid search and landed on the pricing page converted within 7 days.' That query requires Explorations, and if your property is large enough, it will be sampled. The more dimensions and filters you layer on, the worse the sampling gets."
    },
    {
      "type": "callout",
      "text": "The cruelest part of GA4 sampling: it hits hardest on the exact analyses that justify your biggest spending decisions — funnel optimization, campaign ROI, and cohort retention. The queries that matter most are the ones least likely to be accurate."
    },
    {
      "type": "h2",
      "text": "What you can actually do about it",
      "id": "what-you-can-actually-do"
    },
    {
      "type": "h3",
      "text": "Option 1: Shorten your date range",
      "id": "option-1-shorten-your-date-range"
    },
    {
      "type": "p",
      "text": "This is the free fix. If you are hitting the 10M event threshold over 90 days, try 30 days. The sampling percentage often drops to zero or near zero, and the analysis becomes accurate. The obvious limitation: you cannot analyze longer-term trends or cohorts that require multi-month windows."
    },
    {
      "type": "h3",
      "text": "Option 2: Reduce event volume",
      "id": "option-2-reduce-event-volume"
    },
    {
      "type": "p",
      "text": "If you are firing events on every scroll pixel or collecting data you never actually use, trimming your event implementation lowers the denominator. Audit your GA4 event list. Most properties I have looked at are collecting 20-30% more events than their team ever queries. Fewer events means a higher unsampled threshold."
    },
    {
      "type": "h3",
      "text": "Option 3: Export to BigQuery",
      "id": "option-3-bigquery-export"
    },
    {
      "type": "p",
      "text": "GA4 has a free BigQuery export. Once your raw events are in BigQuery, you can query them without any sampling at all — you are hitting the real data. This is genuinely the best technical solution for teams that need unsampled historical analysis and have someone who can write SQL. The catch: BigQuery has its own costs at scale, the export has a 24-48 hour lag, and you need someone who knows what they are doing to write queries that are meaningful."
    },
    {
      "type": "h3",
      "text": "Option 4: GA4 360",
      "id": "option-4-ga4-360"
    },
    {
      "type": "p",
      "text": "GA4 360 raises the sampling threshold to around 1 billion events per date range query. It also gives you access to unsampled exports and a few other enterprise features. The price is approximately $50,000 per year. For a bootstrapped SaaS or indie ecommerce store, this is not a real option. I mention it for completeness, not as a recommendation."
    },
    {
      "type": "h3",
      "text": "Option 5: Use a different tool for the queries that matter",
      "id": "option-5-use-a-different-tool-for-the-queries-that-matter"
    },
    {
      "type": "p",
      "text": "This is what I actually recommend for most small teams. GA4 is fine for broad traffic visibility. Where it falls short is connecting traffic source to revenue, showing you accurate conversion funnels without sampling, and giving you behavioral data like click maps and scroll depth. These are the things that actually change what you ship next."
    },
    {
      "type": "p",
      "text": "I built Conclick for exactly this use case. It stores all event data, never samples, and is designed around the question 'which traffic actually made money.' It connects directly to Stripe, Paddle, Polar, Lemon Squeezy, and Dodo Payments so you can tie every conversion back to the source, campaign, and funnel step that earned it. It also generates real-screenshot heatmaps and auto-detects your biggest funnel drop-off with the revenue estimate attached to fixing it. It is not a GA4 replacement for enterprise teams who need the full Google ecosystem — but for a founder who wants to know why conversions dropped last Tuesday and which channel is actually profitable, it is more useful than a sampled Exploration. $9/month, no card required for the trial, two-minute setup."
    },
    {
      "type": "h2",
      "text": "The practical decision tree",
      "id": "the-practical-decision-tree"
    },
    {
      "type": "ol",
      "items": [
        "Open your most important GA4 Explorations. Check the shield icon. If they are green and unsampled, you are fine — stop here.",
        "If sampled: is your date range longer than 30 days? Try shortening it. Does sampling disappear? Then narrow date ranges are your workflow.",
        "If you need multi-month funnel or cohort analysis and you have SQL skills: set up the BigQuery export. It is free to set up, costs a few dollars a month at typical indie scale, and gives you exact numbers.",
        "If the queries you actually need are 'where are conversions dropping' and 'which channel makes money' — evaluate whether a purpose-built analytics tool covers those better than GA4 Explorations with sampling errors baked in.",
        "If you are an enterprise team spending over $10K/month on paid acquisition: BigQuery export plus a BI tool is the right answer. GA4 360 only if your team is already embedded in Google's enterprise stack."
      ]
    },
    {
      "type": "h2",
      "text": "One thing most guides skip",
      "id": "one-thing-most-guides-skip"
    },
    {
      "type": "p",
      "text": "Sampling is not the only data quality issue in GA4. Cross-device attribution, consent mode data gaps, and the shift from sessions to events all introduce inaccuracies that have nothing to do with sampling thresholds. GA4 is a genuinely complicated tool that requires ongoing maintenance to produce trustworthy numbers. If your team is spending significant time auditing GA4 data quality rather than acting on insights, that is a sign the tool is not a good fit for your current scale and use case."
    },
    {
      "type": "p",
      "text": "The headline takeaway: check your Explorations for the shield icon today. If it is yellow, you have been making decisions on estimates. Now you know what to do about it."
    }
  ],
  "faq": [
    {
      "question": "At what traffic level does GA4 start sampling data?",
      "answer": "The threshold for standard GA4 properties is approximately 10 million events within the queried date range. This applies only to Explorations, not to standard reports. A busy SaaS or ecommerce site that fires page view, scroll, click, and custom events can hit this threshold within a single month, meaning any 90-day Exploration query will almost certainly be sampled."
    },
    {
      "question": "Are GA4 standard reports (like Acquisition) ever sampled?",
      "answer": "No. Standard reports in GA4 are built on pre-aggregated data tables and are not subject to the sampling threshold. Only Explorations — Funnel exploration, Path exploration, Cohort exploration, Segment overlap, and Free form explorations with custom segments — use the raw event query engine that triggers sampling."
    },
    {
      "question": "How do I check if a specific GA4 Exploration is sampled?",
      "answer": "Open the Exploration and look for the shield icon in the top-right corner of the report canvas. A green shield means unsampled. A yellow or orange shield means GA4 analyzed only a portion of your events. Clicking the icon shows the exact sampling rate — for example, 'Based on 71.4% of sessions.' Anything below 100% is a sampled estimate."
    },
    {
      "question": "Does the BigQuery export from GA4 remove sampling?",
      "answer": "Yes. The BigQuery export sends raw, unsampled event data to a BigQuery table. Queries you run directly against BigQuery are not subject to GA4's Explorations sampling limits. The export is free to configure, though BigQuery charges for storage and query processing — typically a few dollars a month for a small to mid-size property. The main drawbacks are a 24-48 hour data lag and the requirement to write SQL."
    },
    {
      "question": "Can I get unsampled data in GA4 without paying for GA4 360?",
      "answer": "Yes, through two approaches. First, shorten your date range until the event count falls below the 10M threshold — this often eliminates sampling for recent date windows. Second, use the free BigQuery export and run queries there. GA4 360 raises the threshold to around 1 billion events, but at roughly $50K/year it is only realistic for large enterprises."
    },
    {
      "question": "Is GA4 sampling different from Universal Analytics sampling?",
      "answer": "The mechanics are similar but the thresholds and triggers are different. Universal Analytics sampled at the session level for complex reports, with a threshold around 500K sessions. GA4 samples at the event level in Explorations, with a threshold around 10M events. In practice, GA4 sampling affects more mid-size businesses than UA did, because event-based tracking generates far more data points than session-based tracking for the same amount of user activity."
    }
  ],
  "internalLinks": [],
  "relatedTools": [
    "utm-builder"
  ],
  "leadMagnet": {
    "kind": "addWebsite",
    "headline": "Put this into practice",
    "sub": "Conclick gives you privacy-first analytics, heatmaps, funnels, and revenue attribution in one. Free for 14 days, no card.",
    "ctaLabel": "Add My Website"
  },
  "datePublished": "2026-06-18",
  "dateModified": "2026-06-18"
};

export default entry;
