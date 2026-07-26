import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "blog",
  "slug": "metrics-early-saas-should-watch",
  "h1": "The four metrics a pre-$10k MRR SaaS should actually watch",
  "metaTitle": "4 Metrics Pre-$10k MRR SaaS Should Track",
  "metaDescription": "Most early SaaS founders track too many metrics and act on none. Here are the four numbers that actually tell you whether your business is working.",
  "primaryKeyword": "saas metrics to track early stage",
  "tldr": "Before $10k MRR, dashboards full of vanity metrics are a distraction you cannot afford. The four numbers that matter are trial-to-paid conversion rate, time-to-first-value, revenue churn, and the single acquisition channel that is paying for itself. Everything else is noise you optimize after you have real money coming in.",
  "intro": "I talked to a founder last month who had a $1,800 MRR SaaS and could tell me his DAU/MAU ratio, his bounce rate, his average session duration, and the open rate on his onboarding sequence. He could not tell me what percentage of his trials converted to paid. He did not know. That is not a data problem. That is a focus problem, and it is killing more early-stage SaaS companies than competition ever will.",
  "sections": [
    {
      "type": "p",
      "text": "Here is the honest situation at pre-$10k MRR. You have a product that is probably good enough. You have some traffic, some sign-ups, maybe a few dozen paying customers. You are trying to figure out whether you have a real business or an expensive hobby. The answer is sitting in four numbers. Not fourteen. Four."
    },
    {
      "type": "h2",
      "text": "1. Trial-to-paid conversion rate",
      "id": "metric-1-trial-to-paid"
    },
    {
      "type": "p",
      "text": "This is the most important number in your business right now. Not your traffic. Not your MRR growth rate. The percentage of people who start a trial and pay you money."
    },
    {
      "type": "p",
      "text": "A reasonable benchmark for a self-serve SaaS is 15 to 25%. If you are below 10%, your product has a gap between what you promise and what people experience. No amount of paid ads fixes that. More trials into a broken funnel is just accelerating your churn problem."
    },
    {
      "type": "p",
      "text": "If you are between 10 and 15%, you have a messaging or activation problem. People see enough value to start a trial but not enough to hand over a credit card. That is usually a time-to-value issue, which brings us to metric two."
    },
    {
      "type": "p",
      "text": "If you are above 25%, you are doing something right. Double down on whatever channel brought those trials in, because those people self-selected well."
    },
    {
      "type": "p",
      "text": "The calculation is simple: divide paying conversions in a period by trials started in the same period (use a lagged window if your trial is 14 days: look at trials that started 14+ days ago and see what converted). Check it weekly. It moves."
    },
    {
      "type": "h2",
      "text": "2. Time-to-first-value",
      "id": "metric-2-time-to-first-value"
    },
    {
      "type": "p",
      "text": "\"First value\" is the specific moment when a new user does the thing that correlates with paying you. Not signing up. Not clicking around. The thing."
    },
    {
      "type": "p",
      "text": "For Slack it was sending a message. For Dropbox it was adding a file. For an analytics tool it might be seeing your first meaningful report. You have to define this specifically for your product, and you have to be honest about it. \"Completing onboarding\" does not count if your onboarding is five modal tooltips they click through in 30 seconds."
    },
    {
      "type": "p",
      "text": "The number you want is the median time, in hours or days, from sign-up to that first-value moment. If your 14-day trial has a median time-to-value of 9 days, you have a problem. Half your users are running out of trial before they even understand what they bought."
    },
    {
      "type": "p",
      "text": "Shortening this number by even two days can move your trial-to-paid rate meaningfully. It is one of the highest-leverage interventions available to you at this stage."
    },
    {
      "type": "callout",
      "text": "If your users need more than 48 hours to see why your product exists, your onboarding is not an education problem. It is a product problem. Fix the product first."
    },
    {
      "type": "h2",
      "text": "3. Revenue churn (not user churn)",
      "id": "metric-3-revenue-churn"
    },
    {
      "type": "p",
      "text": "Most founders track user churn because it is what their analytics tool shows by default. User churn is a lagging indicator with a lot of noise. Revenue churn tells you whether the business is structurally sound."
    },
    {
      "type": "p",
      "text": "Net revenue churn is the percentage of MRR you lost from existing customers in a given month, minus any expansion revenue from upgrades or seat additions. The target is below 2% monthly. Above 5% monthly is a slow bleed you need to stop before anything else, because you are trying to fill a bucket with a hole in the bottom."
    },
    {
      "type": "p",
      "text": "At pre-$10k MRR, you probably do not have enough customers to draw conclusions from a single month of churn data. Look at cohorts. Take every customer who signed up in month X and track what percentage is still paying three months later. Six months later. That cohort retention curve tells you more than your monthly churn rate ever will."
    },
    {
      "type": "p",
      "text": "The pattern you want to see is a curve that flattens. Some churn early (normal), then it levels off, and the survivors stay. If the curve keeps declining, your product is not delivering ongoing value. That is not a retention campaign problem. That is a product problem."
    },
    {
      "type": "p",
      "text": "One thing I want to flag: revenue churn and user churn diverge when you have customers on different plans. Losing five $9/month users while retaining one $79/month customer is a net positive. Track the dollars."
    },
    {
      "type": "h2",
      "text": "4. One channel's CAC payback period",
      "id": "metric-4-one-channel-cac-payback"
    },
    {
      "type": "p",
      "text": "Not your blended CAC. Not your overall LTV:CAC ratio. Pick your single biggest acquisition channel and figure out how long it takes to pay back the cost of acquiring a customer through that channel."
    },
    {
      "type": "p",
      "text": "The formula: (cost to acquire one customer from channel X) / (average monthly revenue from customers from channel X). The result is the number of months until you break even on that acquisition."
    },
    {
      "type": "p",
      "text": "Under 12 months is workable. Under 6 months is healthy. Under 3 months and you should be pouring money into that channel right now."
    },
    {
      "type": "p",
      "text": "This is where attribution becomes genuinely useful, not as a vanity exercise but as a capital allocation decision. If you know that customers who found you through a specific SEO keyword convert at twice the rate of customers from cold outreach, that is a real business decision. Spend your time on the content, not the outreach."
    },
    {
      "type": "p",
      "text": "The problem is that most analytics tools tell you where people came from but not which sources produced customers who actually paid. Pageviews from a traffic source that never buys are worth less than zero; they cost you server resources and inflate your vanity numbers. You want to close the loop between [traffic source and revenue](/glossary/revenue-attribution)."
    },
    {
      "type": "p",
      "text": "This is the only place I will mention Conclick specifically: we built [revenue attribution for SaaS teams](/for/saas) as a core feature, not an add-on, specifically because bootstrapped founders need to know which campaigns produce paying customers, not just visitors. It connects Stripe, Paddle, Polar, Lemon Squeezy, and Dodo payments back to their source. That is the loop that matters."
    },
    {
      "type": "h2",
      "text": "What you are probably tracking instead (and can mostly ignore for now)",
      "id": "what-not-to-watch"
    },
    {
      "type": "ul",
      "items": [
        "Monthly active users: meaningless without a definition of \"active\" that ties to revenue.",
        "Bounce rate: useful for content sites, largely irrelevant for SaaS apps where users log in directly.",
        "Average session duration: a proxy for engagement that does not tell you whether users are succeeding or failing.",
        "Net Promoter Score: you need statistical significance to act on NPS data. Before 200+ customers, it is not reliable.",
        "Traffic volume: traffic that does not convert is a distraction. At this stage, 100 targeted visitors beat 10,000 random ones."
      ]
    },
    {
      "type": "p",
      "text": "None of these are bad metrics in principle. They become useful once your core funnel is working. Right now, before $10k MRR, optimizing them is rearranging deck chairs."
    },
    {
      "type": "h2",
      "text": "How to actually use these four numbers",
      "id": "how-to-use-these-four"
    },
    {
      "type": "p",
      "text": "Put them on a single page. A spreadsheet is fine. Check them every Monday. Look for movement, not perfection."
    },
    {
      "type": "p",
      "text": "The diagnostic flow is this: if trial-to-paid is low, investigate time-to-first-value first. If time-to-first-value looks fine but conversion is still low, talk to people who did not convert. Do not guess. If revenue churn is high, look at cohorts by acquisition channel, because you may have one bad channel poisoning the whole number. If your CAC payback is over 18 months on every channel, you either have a pricing problem or a retention problem, and you need to figure out which."
    },
    {
      "type": "p",
      "text": "These four metrics tell a coherent story together. Trial conversion tells you about product-market fit. Time-to-value tells you about activation. Revenue churn tells you about ongoing value delivery. CAC payback tells you about sustainability. If all four are healthy, you have a business. Fix whichever one is broken first, in that order."
    },
    {
      "type": "p",
      "text": "There is no shortcut past this. I have watched founders spend months [A/B testing button colors](/blogs/ab-testing-with-low-traffic) while their trial conversion rate sat at 7% and nobody asked why. The metrics do not lie. The question is whether you are watching the right ones."
    }
  ],
  "faq": [
    {
      "question": "What counts as a \"good\" trial-to-paid conversion rate for a self-serve SaaS?",
      "answer": "Generally 15 to 25% is solid for a self-serve product. Below 10% signals a gap between what you promise and what people experience during the trial. Above 25% usually means your traffic sources are well-targeted. The number varies by price point (a $200/month product will naturally convert lower than a $9/month product), but the directional benchmarks hold."
    },
    {
      "question": "How do I define \"first value\" for my specific product?",
      "answer": "Look at your paying customers who have been with you 3+ months. Interview five of them and ask: what was the moment you knew this was worth paying for? The answer is usually specific and repeatable. That moment is your first-value event. If you cannot get answers from customers, look at behavioral data and find what action users who converted did that non-converting users did not."
    },
    {
      "question": "My churn looks fine on paper but I keep losing customers. What am I missing?",
      "answer": "You are probably looking at monthly churn rates rather than cohort retention curves. A 3% monthly churn sounds manageable until you realize it means 30% of your customers leave every year. Pull a cohort from 6 months ago and count who is still paying. That retention curve will show you whether you have a real retention problem or a math communication problem."
    },
    {
      "question": "Should I be running paid ads before $10k MRR?",
      "answer": "Only if you have already found at least one channel with a CAC payback under 12 months without paid ads: SEO, content, community, cold outreach, whatever works for your product. Paid ads before product-market fit is a way to spend money to learn things you could learn for free by talking to your early users. If your trial conversion is below 15%, fix that before spending on acquisition."
    },
    {
      "question": "When should I start tracking more metrics beyond these four?",
      "answer": "Once all four core metrics are in a healthy range and you are consistently above $10k MRR with low churn, you have enough signal to start segmenting and optimizing. At that point, tracking things like expansion MRR, feature adoption rates, or NPS scores will give you actionable data. Before that, adding metrics mostly adds noise and spreads your attention thin."
    }
  ],
  "internalLinks": [
    {
      "href": "/blogs/vanity-metrics-are-lying",
      "label": "Vanity metrics are lying to you",
      "group": "blog"
    },
    {
      "href": "/glossary/revenue-attribution",
      "label": "What is revenue attribution?",
      "group": "glossary"
    },
    {
      "href": "/blogs/ab-testing-with-low-traffic",
      "label": "A/B testing with low traffic",
      "group": "blog"
    },
    {
      "href": "/for/saas",
      "label": "Analytics for SaaS teams",
      "group": "useCase"
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
  "dateModified": "2026-07-22"
};

export default entry;
