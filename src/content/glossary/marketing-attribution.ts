import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "glossary",
  "slug": "marketing-attribution",
  "h1": "Marketing Attribution: What It Is and Why It Actually Matters",
  "metaTitle": "Marketing Attribution Explained: Models, Mistakes & Metrics",
  "metaDescription": "Marketing attribution tells you which channels, campaigns, and touchpoints actually caused a sale. Here's how it works, where most teams go wrong, and how to do it right.",
  "tldr": "Marketing attribution is the practice of assigning credit for a conversion — a sale, signup, or lead — to the specific marketing touchpoints that influenced it. Get it right and you stop guessing which spend earns its keep; get it wrong and you fund the wrong channels while the real winners starve.",
  "intro": "Most analytics dashboards will tell you how many people visited your site. Very few will tell you which of those visitors paid you money, and why. That gap is exactly what marketing attribution is supposed to close. It is the discipline of connecting revenue outcomes back to the campaigns, channels, and moments that caused them.",
  "sections": [
    {
      "type": "h2",
      "text": "What Marketing Attribution Actually Is",
      "id": "what-is-marketing-attribution"
    },
    {
      "type": "p",
      "text": "A customer rarely buys the first time they encounter your product. They might click a Google ad on Tuesday, ignore it, read a blog post of yours on Friday, get retargeted on Instagram the following week, then finally sign up after clicking a link in a newsletter. That path — from first touch to payment — is called a conversion journey. Marketing attribution is the system that records that journey and decides how much credit each touchpoint gets."
    },
    {
      "type": "p",
      "text": "Attribution is not a single thing. It is a category of measurement approaches, each making different assumptions about human behavior and decision-making. The output is always the same: a number (usually revenue or conversion count) assigned to each marketing source, so you can judge whether that source is worth the time or money you are spending on it."
    },
    {
      "type": "h2",
      "text": "The Main Attribution Models",
      "id": "attribution-models"
    },
    {
      "type": "p",
      "text": "Every attribution model is a simplification. The question is which simplification is honest enough to be useful."
    },
    {
      "type": "h3",
      "text": "Single-Touch Models",
      "id": "single-touch-models"
    },
    {
      "type": "ul",
      "items": [
        "First-touch attribution: 100% of the credit goes to the very first channel that brought the visitor to your site. Good for understanding where awareness comes from. Terrible for understanding what closes deals.",
        "Last-touch attribution: 100% of the credit goes to the last channel before conversion. This is the default in most cheap analytics tools and in Google Analytics' older reports. It systematically overstates direct traffic and branded search because those are almost always the final step, not the cause.",
        "Last non-direct touch: A slight improvement on last-touch — it ignores the final 'direct' visit and credits the channel before it. Useful heuristic, still incomplete."
      ]
    },
    {
      "type": "h3",
      "text": "Multi-Touch Models",
      "id": "multi-touch-models"
    },
    {
      "type": "ul",
      "items": [
        "Linear attribution: Credit is split equally across every touchpoint in the journey. Simple to explain, but treats a banner ad someone scrolled past as equivalent to the review site that sealed the deal.",
        "Time-decay attribution: Touchpoints closer to the conversion get more credit. Reasonable for short sales cycles where recency matters.",
        "Position-based (U-shaped): 40% goes to first touch, 40% to last touch, and the remaining 20% is spread across the middle. Reflects the intuition that first impression and final nudge both matter.",
        "Data-driven attribution: Uses your actual conversion data and statistical modeling — sometimes machine learning — to assign credit based on observed patterns. Requires significant conversion volume (typically thousands of events) to be reliable. Google Ads and GA4 offer versions of this."
      ]
    },
    {
      "type": "callout",
      "text": "No attribution model is 'correct.' Every model is a story you tell about causality. The goal is not perfection — it is directional accuracy good enough to make better budget decisions than you would by guessing. Start simple, be consistent, and revisit when you have more data."
    },
    {
      "type": "h2",
      "text": "Why Attribution Matters for Founders",
      "id": "why-attribution-matters"
    },
    {
      "type": "p",
      "text": "If you are running paid ads, content marketing, SEO, newsletter sponsorships, or any combination of them, you are making constant bets about where to spend time and money. Attribution is the scorecard for those bets."
    },
    {
      "type": "p",
      "text": "Without it, you default to proxy metrics — traffic, clicks, impressions — that have a frustrating habit of looking great while revenue stays flat. You might be pouring budget into a channel that generates lots of signups but almost no paying customers, while a smaller channel quietly closes your best accounts. Attribution is how you find out."
    },
    {
      "type": "p",
      "text": "For bootstrapped teams in particular, this is not optional. You cannot afford to fund underperforming channels for months waiting for a pattern to emerge. You need to know which source pays for itself and which one does not. That requires tying your analytics to actual payment data — not just page views."
    },
    {
      "type": "h2",
      "text": "How to Actually Measure Attribution",
      "id": "how-to-measure-attribution"
    },
    {
      "type": "p",
      "text": "The mechanics come down to three things: tracking the source correctly, persisting that source through the funnel, and connecting it to payment."
    },
    {
      "type": "h3",
      "text": "UTM Parameters",
      "id": "utm-parameters"
    },
    {
      "type": "p",
      "text": "UTM parameters are the tags you append to URLs in your campaigns — source, medium, campaign, term, content. When a visitor arrives via a tagged link, your analytics tool reads those tags and records them. This is the foundation of campaign attribution. If you are not tagging your links consistently, your data is already broken."
    },
    {
      "type": "h3",
      "text": "Session and User-Level Tracking",
      "id": "session-and-user-level-tracking"
    },
    {
      "type": "p",
      "text": "A visitor might land from a campaign, browse your site, leave, come back directly three days later, and then subscribe. You need your analytics layer to persist the original source across that journey — not just the last session. This is where many cookie-less tools fall short: they record sessions accurately but cannot stitch them into a single user journey."
    },
    {
      "type": "h3",
      "text": "Connecting to Revenue",
      "id": "connecting-to-revenue"
    },
    {
      "type": "p",
      "text": "Page-level attribution tells you where people came from. Revenue attribution tells you which of those people paid, how much, and whether they churned. The gap between those two data points is where most small teams misallocate their marketing spend. Closing it requires your analytics tool to receive a signal when a payment actually occurs — either via a payment processor webhook or an event fired at checkout."
    },
    {
      "type": "h2",
      "text": "Common Attribution Mistakes",
      "id": "common-attribution-mistakes"
    },
    {
      "type": "ul",
      "items": [
        "Measuring signups instead of revenue. A channel that drives signups but low-LTV customers looks great until you run the numbers. Always attribute to the outcome that pays your rent.",
        "Ignoring assisted conversions. If your last-touch report says organic search drives 60% of revenue but your first-touch report shows paid social introduces most of those customers, cutting paid social is a mistake. Both touchpoints matter.",
        "Overcounting direct traffic. 'Direct' is a catch-all for sessions with no recorded referrer — it includes people who typed your URL, but also broken UTM tags, email clients that strip referrers, and HTTPS-to-HTTP referrer loss. A very high direct share usually means a tracking problem, not a branding success.",
        "Setting it and forgetting it. Attribution accuracy degrades as your funnel changes. New landing pages, new checkout flows, changed UTM conventions — each one can silently corrupt your data if you are not auditing periodically.",
        "Trusting a single model. Run first-touch and last-touch side by side. Channels that rank high on both models are your anchors. Channels that rank high on first-touch but low on last-touch are your awareness drivers — valuable, but different from closers."
      ]
    },
    {
      "type": "h2",
      "text": "How Conclick Handles This",
      "id": "attribution-in-conclick"
    },
    {
      "type": "p",
      "text": "I built Conclick specifically because I kept staring at analytics dashboards full of traffic numbers that could not tell me which channels made money. The tool connects directly to Stripe, Paddle, Polar, Lemon Squeezy, or Dodo and ties every payment back to the source, UTM campaign, and funnel step that preceded it. So instead of 'SEO drove 400 visits,' you see 'SEO drove $1,840 in MRR from 12 customers this month.' That is the number that actually informs a decision."
    },
    {
      "type": "p",
      "text": "It also auto-detects funnel drop-offs and shows you exactly which step loses the most revenue — not just where traffic exits, but the dollar amount attached to that leak. It is cookieless, takes about two minutes to set up, and does not require a consent banner in most jurisdictions. There is a 14-day free trial, no card needed, starting at $9/month."
    }
  ],
  "faq": [
    {
      "question": "What is the difference between first-touch and last-touch attribution?",
      "answer": "First-touch attribution gives 100% of the conversion credit to the very first channel that brought a visitor to your site. Last-touch gives 100% to the final channel they used before converting. First-touch overvalues awareness channels like display ads or social discovery. Last-touch overvalues the final step — typically direct, branded search, or email — which often just captures demand that other channels already generated. Neither model is complete on its own; the right approach is to look at both and understand what each is telling you."
    },
    {
      "question": "Can I do marketing attribution without cookies?",
      "answer": "Yes. Cookie-less attribution uses a combination of UTM parameters, referrer data, and server-side signals to connect sessions to sources. The main trade-off is cross-session stitching — linking a visitor's first session to a later returning session — which is harder without a persistent identifier. For most small SaaS and ecommerce businesses, session-level attribution with solid UTM discipline captures enough to make good decisions, and it avoids the consent and compliance headaches that come with cookie-based tracking."
    },
    {
      "question": "What are UTM parameters and do I actually need them?",
      "answer": "UTM parameters are query-string tags you append to campaign URLs: utm_source (e.g., 'twitter'), utm_medium (e.g., 'social'), utm_campaign (e.g., 'april-launch'). When a visitor arrives via that tagged link, your analytics tool reads and stores those values. Without UTM tags, any traffic from that link gets lumped into 'direct' or 'referral' with no campaign detail. If you run any paid or outbound campaigns — email, ads, sponsorships, social — consistent UTM tagging is non-negotiable for attribution to work."
    },
    {
      "question": "How does revenue attribution differ from standard conversion tracking?",
      "answer": "Standard conversion tracking records whether a user completed a goal — a signup, a form submit, a checkout. Revenue attribution goes further: it records how much money that conversion was worth, whether the customer retained or churned, and maps that monetary outcome back to the originating source. A channel that drives 200 free signups but $0 in paid conversions looks very different under revenue attribution than under standard conversion tracking. The distinction matters most when your free-to-paid or trial-to-paid conversion rate varies significantly by source."
    },
    {
      "question": "What conversion volume do I need for data-driven attribution to work?",
      "answer": "Google's data-driven attribution model requires at least 300 conversions per month per conversion action to produce reliable results — and ideally several thousand. For most early-stage or bootstrapped products, that volume is not there yet. At lower volumes, a simpler model like linear or position-based attribution applied consistently will give you more stable and interpretable results than a statistical model trained on insufficient data."
    },
    {
      "question": "Is attribution different for SaaS versus ecommerce?",
      "answer": "The mechanics are the same but the timeframes and metrics differ. Ecommerce attribution typically deals with short purchase cycles — often the same session — so last-touch models are less distorted. SaaS attribution has to account for long evaluation periods, trials, and the gap between signup and first payment. For SaaS, you also care about MRR and LTV by source, not just conversion count — a channel that acquires many low-LTV customers is less valuable than it appears in raw conversion data. Revenue attribution, tied to your payment processor, is how you measure that correctly."
    }
  ],
  "internalLinks": [],
  "relatedTools": [],
  "leadMagnet": {
    "kind": "addWebsite",
    "headline": "Measure this automatically",
    "sub": "Conclick tracks this out of the box, alongside heatmaps, funnels, and revenue attribution. Free for 14 days, no card.",
    "ctaLabel": "Add My Website"
  },
  "datePublished": "2026-06-18",
  "dateModified": "2026-06-18"
};

export default entry;
