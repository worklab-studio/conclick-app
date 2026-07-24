import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "ga4-migration-guide",
  "h1": "Migrating off Google Analytics 4: a practical guide",
  "metaTitle": "Migrating off Google Analytics 4: a practical guide",
  "metaDescription": "Step-by-step guide to exporting your GA4 data, picking a replacement, and getting back to answers faster than GA4 ever gave them.",
  "tldr": "You can migrate off GA4 in an afternoon: export your history via BigQuery or the Data API, install the replacement tracker, verify parity on your top pages and conversion events, then delete the property once you are confident. The hard part is deciding what you actually need. Most founders want revenue attribution and real conversion data, not 500 dimensions they will never open.",
  "intro": "I spent three years trying to make GA4 answer one question: which traffic source actually makes me money? It never gave me a straight answer. The interface buries conversion revenue behind four report customizations, sampling kicks in the moment your data gets interesting, and the consent banner requirements in Europe meant I was losing 30 to 40% of my data anyway. If you are reading this, you have probably hit the same wall.",
  "sections": [
    {
      "type": "h2",
      "text": "Why people leave GA4 (and why some should stay)",
      "id": "why-migrate"
    },
    {
      "type": "p",
      "text": "Let me be honest about when GA4 is the right tool. If you run a large enterprise, have a dedicated analytics team, and need deep integration with Google Ads bidding algorithms, GA4 is genuinely hard to beat. It is free, it has massive documentation, and its integration with Google's ad products is unmatched. Staying put is a legitimate choice."
    },
    {
      "type": "p",
      "text": "The people who should leave are mostly founders and small teams who are drowning in GA4's complexity and getting nothing actionable out of it. Specific symptoms: you have never successfully built a funnel report, you do not know your revenue per traffic source, your consent banner is tanking your data quality in the EU, or you just flat-out dread opening the dashboard. Those are real problems, and GA4 is not going to fix them. If that describes you, [my own story of giving up on GA4](/blogs/gave-up-on-ga4) walks through the specific afternoons that finally pushed me off it, in case it saves you a few of yours."
    },
    {
      "type": "h2",
      "text": "Step 1: Export your data before you do anything else",
      "id": "export-first"
    },
    {
      "type": "p",
      "text": "Do not delete your GA4 property on day one. Historical data has real value: year-over-year comparisons, baseline conversion rates, attribution models you will want to reference. Take the time to export it properly first."
    },
    {
      "type": "h3",
      "text": "The BigQuery route (most complete)",
      "id": "bigquery-export"
    },
    {
      "type": "p",
      "text": "GA4 has a native BigQuery export that writes raw event data to Google Cloud daily. If you have not enabled it yet, do it today. It takes 24 hours before the first batch lands. Go to Admin > Product links > BigQuery links, connect a GCP project, and enable streaming export if you want intraday data. This gives you a complete raw event log you can query forever, even after you remove the GA4 tag from your site."
    },
    {
      "type": "p",
      "text": "Once the export is running, write a few key queries to archive: sessions by source/medium by month, goal completions by event name, and your top landing pages by conversion rate. Store the results as CSVs. BigQuery free tier covers 1 TB of queries per month, which is plenty for a site doing under a few million monthly events."
    },
    {
      "type": "h3",
      "text": "The Data API route (simpler, less complete)",
      "id": "data-api-export"
    },
    {
      "type": "p",
      "text": "If you did not set up BigQuery ahead of time, use the GA4 Data API. The Python client library makes this manageable. Pull your top dimensions (sessionDefaultChannelGroup, landingPage, eventName) with metrics like sessions, conversions, and totalRevenue. GA4 stores data for 14 months in the standard interface and up to 50 months if you enabled data retention settings. Check your retention setting under Admin > Data settings > Data retention before you assume anything is there."
    },
    {
      "type": "h3",
      "text": "What you will lose and cannot recover",
      "id": "what-you-will-lose"
    },
    {
      "type": "p",
      "text": "Raw session replays and heatmap data do not live in GA4; those were always third-party tools. What you genuinely cannot reconstruct after deleting a GA4 property: user-level paths, audience definitions for retargeting (if you were using GA4 audiences in Google Ads), and any custom channel groupings you built. Document those channel groupings before you leave. Screenshot every custom report you actually use."
    },
    {
      "type": "h2",
      "text": "Step 2: Pick a replacement that matches what you actually need",
      "id": "picking-replacement"
    },
    {
      "type": "p",
      "text": "The analytics market split into two camps: privacy-first tools that skip cookies entirely, and full-stack behavioral tools that go deeper on session recording and product analytics. You probably need to know which camp your use case falls into before you shop."
    },
    {
      "type": "p",
      "text": "If your core question is 'which channel and campaign makes me money,' you want something with first-party [revenue attribution](/glossary/revenue-attribution), ideally connected directly to your payment processor rather than relying on manual goal values. If your core question is 'where are users getting confused in my UI,' you want session recordings and heatmaps. If you need both, you either use two tools or find something that covers both."
    },
    {
      "type": "p",
      "text": "For bootstrapped founders on SaaS or ecommerce, I built Conclick specifically for this gap: it connects directly to Stripe, Paddle, Polar, Lemon Squeezy, or Dodo Payments and ties every payment back to the source and campaign that earned it. It also does real-screenshot heatmaps and click maps, auto-detected funnels that show you your single biggest revenue drop-off, and a cookieless script that typically does not require a consent banner. Setup is about 2 minutes. It is $9/month or $7 billed yearly, with a 14-day free trial and no card required. That said, if you are a large team running complex Google Ads bid strategies, it is not the right fit. Plausible and Fathom are both excellent privacy-first alternatives that are more general-purpose. PostHog is worth looking at if you need deep product analytics and session recordings and are comfortable with self-hosting."
    },
    {
      "type": "callout",
      "text": "The consent banner problem is underappreciated. In Germany, France, and most EU markets, a properly implemented consent banner will cut your measured traffic by 30 to 60%. [Cookieless tools](/glossary/cookieless-analytics) that rely on first-party aggregation rather than user-level tracking often sidestep this entirely, which means your data actually reflects reality instead of only the users who clicked Accept."
    },
    {
      "type": "h2",
      "text": "Step 3: Run both tools in parallel for 2 to 4 weeks",
      "id": "parallel-run"
    },
    {
      "type": "p",
      "text": "Do not do a hard cutover. Install your new tool alongside GA4 for at least two weeks. You want to answer four questions before you trust the new tool: Does session volume look plausible relative to GA4? Are your top landing pages roughly consistent? Are your conversion events firing on the actions you expect? And does revenue attribution roughly match what your payment processor reports?"
    },
    {
      "type": "p",
      "text": "Expect the numbers to differ. Cookie-based tools like GA4 and cookieless tools measure sessions differently. GA4 counts a new session after 30 minutes of inactivity or at midnight; cookieless tools use different heuristics. A 10 to 20% variance in session count is normal and not a sign that something is broken. What you should not accept is a 50% discrepancy in conversion events or a revenue figure that is off by more than noise."
    },
    {
      "type": "h3",
      "text": "Verifying conversion tracking specifically",
      "id": "check-conversions"
    },
    {
      "type": "p",
      "text": "This is where most migrations go wrong. GA4 conversion tracking relies on event parameters that fire on specific conditions. Your new tool may use a different mechanism: URL-based goal matching, API webhooks from your payment processor, or a JavaScript event API. Walk through a real purchase or signup on your own site and confirm the event appears in both tools within a few minutes. Do this in a private browser window so you are not filtered by your own IP exclusions."
    },
    {
      "type": "h2",
      "text": "Step 4: Decommission GA4 cleanly",
      "id": "decommission"
    },
    {
      "type": "p",
      "text": "Once you are confident in your replacement, remove the GA4 tag from your site. If you used Google Tag Manager, delete or pause the GA4 configuration tag there. Do not just remove the GTM container snippet, because that would break other tags too. If you added the gtag.js snippet directly, remove that script tag from your HTML."
    },
    {
      "type": "p",
      "text": "Wait 30 days before deleting the GA4 property itself. Keep it in admin-only mode, not collecting data, but still accessible for historical lookups. After 30 days, if you have not needed it, delete it. Google will hold the property data for 35 days after deletion before purging it permanently, so you have a small recovery window if you change your mind."
    },
    {
      "type": "h3",
      "text": "Do not conflate GA4 with Google Search Console",
      "id": "google-search-console"
    },
    {
      "type": "p",
      "text": "Search Console is a separate product and you should keep it regardless of what you do with GA4. It gives you real click and impression data from Google Search that no third-party analytics tool can replicate, because it comes straight from Google's index. Many tools, including Conclick, can import Search Console data so you see your organic search keywords alongside your revenue metrics without needing to open a second dashboard."
    },
    {
      "type": "h2",
      "text": "What to actually look at once you have migrated",
      "id": "after-migration"
    },
    {
      "type": "p",
      "text": "The first week after migration is a good forcing function to define what you actually care about. I recommend building exactly three reports: revenue by source/medium for the last 30 days, conversion rate by landing page, and [your primary funnel](/guides/how-to-read-a-funnel) with drop-off percentages at each step. If your new tool cannot answer all three of those out of the box, you picked the wrong tool."
    },
    {
      "type": "p",
      "text": "The goal is not to replicate GA4. GA4 is a maximalist tool that tries to capture everything. Most founders need an opinionated tool that surfaces the 10% of data that actually drives decisions. If you find yourself spending more than 15 minutes a week in your analytics dashboard, that is a sign the tool is making you work too hard for the answer."
    }
  ],
  "faq": [
    {
      "question": "Will I lose my historical GA4 data when I migrate?",
      "answer": "Not immediately. Google retains data in a deleted GA4 property for 35 days, giving you a small recovery window. But the right move is to export before you delete: enable the BigQuery export now if you want raw event data, or use the Data API to pull aggregated reports as CSVs. Standard GA4 properties retain up to 14 months of data in the interface; if you changed the retention setting to 50 months, check that first."
    },
    {
      "question": "How long should I run two analytics tools at the same time before switching?",
      "answer": "Two to four weeks is usually enough. You want to capture at least one full business cycle: if you have a weekly traffic pattern, two weeks covers it twice. The main things to verify in parallel: session volume is plausible, conversion events fire correctly, and revenue attribution matches what your payment processor reports. A 10 to 20% session count variance between a cookie-based tool and a cookieless one is normal and not a red flag."
    },
    {
      "question": "Do I still need a consent banner if I switch to a cookieless analytics tool?",
      "answer": "In many jurisdictions, no, but it depends on the specific tool and your site. Cookieless tools that do not set persistent identifiers or process personal data often fall outside GDPR's consent requirements. However, 'cookieless' does not automatically mean exempt: tools that fingerprint users or link sessions to identifiable data may still require consent. Read the specific tool's data processing documentation and check with your legal counsel if you operate in the EU at scale."
    },
    {
      "question": "Can I import my GA4 historical data into a new analytics tool?",
      "answer": "A few tools support GA4 data imports, but coverage varies. Typically what is importable is aggregated metric data (sessions, pageviews, conversions by source and date), not raw event-level logs. Raw event data portability requires the BigQuery export. Conclick, for example, can import GA4 data so you have continuity in your dashboards; check the specific import scope in the documentation before assuming full parity."
    },
    {
      "question": "What happens to my Google Ads conversion tracking if I remove GA4?",
      "answer": "This is the most important question to answer before you migrate. If your Google Ads campaigns use GA4 conversion events for bidding (Smart Bidding, target CPA, target ROAS), removing GA4 will break those signals and your campaigns will likely underperform. You need to either switch your Ads account to use Google Ads native conversion tracking (tracked via the gtag or Google Ads tag, separate from GA4) or import conversions from a different source. Audit your Google Ads conversion actions before touching GA4."
    },
    {
      "question": "Is Plausible, Fathom, or Conclick better for a SaaS business?",
      "answer": "It depends on your primary question. Plausible and Fathom are excellent general-purpose privacy-first tools: clean dashboards, honest traffic data, easy setup, no consent banner in most cases. Neither natively connects to your payment processor for revenue attribution. If knowing which campaigns and funnels actually generate paying customers is your top priority, and you use Stripe, Paddle, Polar, Lemon Squeezy, or Dodo, Conclick is built specifically for that. If you want deep session recordings and product analytics, PostHog or Hotjar cover that ground and are worth the added complexity."
    }
  ],
  "internalLinks": [
    {
      "href": "/guides/is-ga4-sampling-your-data",
      "label": "Is GA4 sampling your data?",
      "group": "guide"
    },
    {
      "href": "/alternatives/google-analytics",
      "label": "Google Analytics alternatives",
      "group": "alternative"
    },
    {
      "href": "/glossary/cookieless-analytics",
      "label": "What is cookieless analytics?",
      "group": "glossary"
    },
    {
      "href": "/guides/gdpr-analytics-checklist",
      "label": "GDPR analytics checklist",
      "group": "guide"
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
  "datePublished": "2026-06-18",
  "dateModified": "2026-07-24"
};

export default entry;
