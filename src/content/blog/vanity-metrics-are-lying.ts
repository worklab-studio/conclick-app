import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "blog",
  "slug": "vanity-metrics-are-lying",
  "h1": "Vanity metrics are lying to you about what is working",
  "metaTitle": "Vanity Metrics Are Lying to Your Face",
  "metaDescription": "Pageviews, social likes, and newsletter open rates feel like progress. They are not. Here is how to find the numbers that actually move revenue.",
  "tldr": "Vanity metrics are the analytics equivalent of applause — they feel great and prove nothing. Most founders are optimizing for numbers that have zero relationship to revenue, and the actual signals are buried three clicks deep in a tool they barely open. Stop tracking what flatters you. Start tracking what pays you.",
  "intro": "Last year I watched a founder celebrate 40,000 monthly visitors. He had a t-shirt made. He told his accelerator cohort. He wrote a tweet thread. He also had $600 in MRR after 14 months of building. The visitors were real. The business was not. Vanity metrics do not just fail to help you — they actively steer you wrong, because they create the feeling of momentum where none exists. I have been guilty of this. You probably have too. Here is what I know now that I wish I had known earlier.",
  "sections": [
    {
      "type": "h2",
      "text": "What vanity metrics actually are",
      "id": "what-vanity-metrics-actually-are"
    },
    {
      "type": "p",
      "text": "A vanity metric is any number that goes up and makes you feel good but has no proven connection to revenue or retention. Pageviews. Social followers. Email subscribers (in isolation). App downloads. Time on site as a standalone figure. None of these are inherently meaningless — but they become vanity metrics the moment you track them without anchoring them to money."
    },
    {
      "type": "p",
      "text": "The problem is not that these numbers are fake. The problem is that they are easy. They go up reliably. They respond to effort. You write a post, pageviews spike. You run a giveaway, followers climb. Your brain releases dopamine. You feel like you are growing. Meanwhile your conversion rate is 0.3% and you have no idea why."
    },
    {
      "type": "h2",
      "text": "The substitution trap",
      "id": "the-substitution-trap"
    },
    {
      "type": "p",
      "text": "Humans default to measuring what is easy to measure rather than what matters. Daniel Kahneman called this substitution: when faced with a hard question, the brain quietly swaps it for an easier one. 'Is my marketing working?' is hard. 'Did traffic go up this week?' is easy. You answer the easy question and feel like you answered the hard one."
    },
    {
      "type": "p",
      "text": "Every vanity metric is a substitution. Here are the substitutions I see founders make constantly:"
    },
    {
      "type": "ul",
      "items": [
        "Pageviews instead of: which traffic source actually converts to paying customers",
        "Email open rate instead of: which email sequence drives trial signups or purchases",
        "Social engagement instead of: which content brings people who buy",
        "App store rating instead of: what percentage of users are still active at day 30",
        "Newsletter subscriber count instead of: what is my revenue per subscriber"
      ]
    },
    {
      "type": "p",
      "text": "The substitution feels harmless. It is not. Every hour you spend optimizing open rates is an hour you are not spending figuring out why your trial-to-paid conversion is 4% instead of 12%."
    },
    {
      "type": "h2",
      "text": "The numbers that actually matter",
      "id": "the-numbers-that-actually-matter"
    },
    {
      "type": "p",
      "text": "If you are a bootstrapped SaaS or ecommerce founder, the hierarchy is simple. Revenue metrics sit at the top. Everything below them is only useful insofar as it explains or predicts revenue."
    },
    {
      "type": "h3",
      "text": "Where does money actually come from?",
      "id": "revenue-attribution"
    },
    {
      "type": "p",
      "text": "Not 'where does traffic come from.' Where does revenue come from. These are different questions with frequently different answers. I have seen businesses where Google Ads drove 60% of traffic and 8% of revenue. Organic search drove 20% of traffic and 55% of revenue. If you are optimizing your budget based on traffic source, you are making yourself poorer."
    },
    {
      "type": "p",
      "text": "The only way to answer this correctly is to connect your payment processor — Stripe, Paddle, Lemon Squeezy, whatever you use — to your analytics, so that actual payments get traced back to the session, campaign, or funnel step that caused them. Most analytics tools do not do this. Most founders therefore cannot answer the single most important question in their business."
    },
    {
      "type": "h3",
      "text": "Where is money leaking out?",
      "id": "funnel-drop-off"
    },
    {
      "type": "p",
      "text": "You have a funnel whether you built one intentionally or not. Someone lands on your site, reads a page, hits a pricing page, starts a trial, maybe converts. Every one of those steps has a drop-off rate. Most founders know the final conversion rate. Almost none know which step is doing the most damage."
    },
    {
      "type": "p",
      "text": "Here is a real pattern I have seen: founder has a 2.1% trial-to-paid rate. Assumes the problem is pricing. Spends three months testing pricing. Rate barely moves. Actual problem: 74% of trial users never completed onboarding step 3. Fixing onboarding moves the rate to 6.8%. Three months wasted because they were looking at the output metric instead of the process metric."
    },
    {
      "type": "callout",
      "text": "Your conversion rate tells you something is wrong. Your funnel drop-off tells you where. Fix the where, not the number."
    },
    {
      "type": "h3",
      "text": "What are people not clicking?",
      "id": "what-users-do-not-do"
    },
    {
      "type": "p",
      "text": "Heatmaps and click maps are underrated because most founders think of them as design tools. They are revenue tools. A rage click cluster on your pricing page CTA is not a UX problem — it is a broken button eating your conversions. Dead click zones where users expect something to be clickable are telling you your information architecture is wrong. Scroll depth showing 80% of users never reach your testimonials means your social proof is decorative."
    },
    {
      "type": "p",
      "text": "When I say 'look at what people do not do,' I mean: find the action you want users to take, then work backwards through your click maps to understand how many people tried and failed, or got distracted before they tried. That number will ruin your week and improve your quarter."
    },
    {
      "type": "h2",
      "text": "The dashboard problem",
      "id": "the-dashboard-problem"
    },
    {
      "type": "p",
      "text": "Most founders have a dashboard that shows them what is easy to show. Pageviews in big font. Sessions. Bounce rate (a mostly useless metric in single-page apps, by the way). These are the defaults because most analytics tools are built for content publishers and ad agencies, not for people trying to figure out if their SaaS is going to survive the year."
    },
    {
      "type": "p",
      "text": "The setup cost is also real. Getting Google Analytics wired up to Stripe data in a meaningful way requires either a data engineer or a week of your own time. Most bootstrapped founders do neither. They look at pageviews instead."
    },
    {
      "type": "p",
      "text": "This is the gap that newer, leaner tools are filling. Conclick, for instance, is built specifically for bootstrapped founders who want revenue attribution tied directly to payment processors like Stripe, Paddle, and Lemon Squeezy — without writing a single SQL query. It also surfaces heatmaps and auto-detected funnel drop-offs so you are not manually stitching together three different tools. I mention it because the problem of 'easy metrics vs. useful metrics' is partly a tooling problem, and the tooling has gotten better."
    },
    {
      "type": "h2",
      "text": "How to audit your own metrics right now",
      "id": "how-to-audit-your-own-metrics"
    },
    {
      "type": "p",
      "text": "This takes thirty minutes. Open your current analytics dashboard. For every metric you track, ask one question: if this number doubled tomorrow, would I expect revenue to increase? If the honest answer is 'not necessarily,' that metric is probably a vanity metric for your specific business."
    },
    {
      "type": "ul",
      "items": [
        "If pageviews doubled but traffic mix stayed the same, would revenue go up? Maybe. Depends on your conversion rate and traffic quality.",
        "If email subscribers doubled, would revenue go up? Only if you know your revenue per subscriber and it is positive.",
        "If social followers doubled, would revenue go up? Almost certainly not, unless you have data showing followers convert.",
        "If your funnel completion rate doubled, would revenue go up? Yes. This is a real metric.",
        "If your payment processor showed you which campaign drove the most revenue last month, would you change your ad spend? Yes. Track that."
      ]
    },
    {
      "type": "p",
      "text": "After the audit, you will probably find you have three to five metrics worth watching and ten to fifteen that are just noise. Cut the noise. Build a shorter dashboard. Check it less often but act on it more."
    },
    {
      "type": "h2",
      "text": "The honest version of growth",
      "id": "the-honest-version-of-growth"
    },
    {
      "type": "p",
      "text": "I am not saying ignore traffic or engagement entirely. Traffic is an input. Engagement is an input. But inputs only matter if they produce an output you can measure in money. A blog post that drives 10,000 visits and zero conversions is a branding exercise at best and a distraction at worst."
    },
    {
      "type": "p",
      "text": "The founders who build durable businesses tend to have very short dashboards and very boring answers to 'what are you tracking.' They say things like 'which acquisition channel has the lowest CAC and the highest 90-day retention' and 'where are users dropping out of our trial.' They are not exciting metrics. They are not t-shirt-worthy metrics. They are the metrics that compound."
    },
    {
      "type": "p",
      "text": "Vanity metrics feel like progress because they move. Real metrics feel uncomfortable because they expose the gap between where you are and where you want to be. That discomfort is information. It is the most valuable thing in your analytics stack. Stop hiding from it behind pageview charts."
    }
  ],
  "faq": [
    {
      "question": "Are pageviews ever a useful metric?",
      "answer": "Yes, but only when paired with conversion data by traffic source. Raw pageviews tell you volume, not quality. If you know that 1,000 organic visitors convert at 3% and 1,000 paid visitors convert at 0.5%, pageviews by channel become meaningful. On their own, they are noise."
    },
    {
      "question": "What is the minimum viable set of metrics for a bootstrapped SaaS?",
      "answer": "Revenue by acquisition source. Trial-to-paid conversion rate by cohort. Funnel drop-off at each onboarding step. Churn rate by plan. That is four numbers. You can run a real business on those four numbers. Everything else is optional."
    },
    {
      "question": "My analytics tool does not connect to my payment processor. Is that a big deal?",
      "answer": "It is the biggest deal. Without that connection, every decision you make about marketing and product is based on traffic behavior, not buying behavior. These are correlated but not identical. You will consistently over-invest in channels that drive curious people and under-invest in channels that drive paying people."
    },
    {
      "question": "How often should I actually look at my analytics?",
      "answer": "Weekly for trend data, daily only if you are running an active experiment or launch. The founders who check analytics obsessively tend to make reactive decisions based on noise. Set a weekly review rhythm, define one or two things you are trying to move, and ignore everything else until that review."
    },
    {
      "question": "Is social proof like followers or reviews ever worth tracking?",
      "answer": "Reviews are worth tracking because they affect conversion rate on landing pages and app stores, and that connection is measurable. Follower counts are almost never worth tracking for a bootstrapped SaaS unless you have actual data showing a follower-to-trial pipeline. Most founders do not. Most founders track it anyway."
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
