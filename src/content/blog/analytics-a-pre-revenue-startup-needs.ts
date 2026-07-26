import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "blog",
  "slug": "analytics-a-pre-revenue-startup-needs",
  "h1": "How Much Analytics Does an Early-Stage Startup Actually Need?",
  "metaTitle": "Analytics for an Early-Stage Startup: Do Less of It",
  "metaDescription": "How much analytics does an early-stage startup need before revenue? Almost none: track arrivals, the one key action, and where people fall off. The minimal setup.",
  "primaryKeyword": "analytics for early stage startups",
  "tldr": "The analytics an early-stage startup actually needs before revenue is almost none: enough to see whether people arrive, whether they reach the one action that matters, and where they fall off before it. That is three numbers, not a full event taxonomy. Everything past that is procrastination dressed as rigor.",
  "intro": "I have watched more pre-launch founders build a forty-event tracking plan than build the one screen people are supposed to use. The honest answer to how much analytics an early-stage startup needs is: barely any, and none of it is a taxonomy. Before you have paying customers, three plain numbers tell you what a dashboard of forty could, and they take an afternoon to wire up.",
  "sections": [
    {
      "type": "h2",
      "text": "How much analytics does an early-stage startup need?",
      "id": "how-much"
    },
    {
      "type": "p",
      "text": "Almost none. Before there are paying customers, the job of measurement is to answer three questions and no more: are people arriving, do the ones who arrive reach the single action your product is built around, and where do they quit before they get there. Three numbers. If your setup answers those, it is doing its whole job. If it answers forty questions, thirty-seven of them are questions you cannot act on yet, because you do not have enough users or enough money on the line to tell signal from noise."
    },
    {
      "type": "p",
      "text": "I say this as someone who builds a measurement product for a living, and who still tells pre-launch founders to install the smallest thing that works and walk away. A rich dashboard at zero users is a mirror, not a window. It reflects your own assumptions back at you in chart form and feels like progress, while the actual bottleneck, the thing that decides whether you have a company, sits untouched inside the product."
    },
    {
      "type": "callout",
      "text": "A tracking plan with forty events and eleven users is not rigor. It is a very organised way of avoiding the one conversation that matters: watching a real person try to use the thing and fail."
    },
    {
      "type": "h2",
      "text": "The three questions that are the whole job",
      "id": "three-questions"
    },
    {
      "type": "p",
      "text": "Strip measurement down to what a pre-revenue company can actually act on and you are left with three things, in this order:"
    },
    {
      "type": "ul",
      "items": [
        "Are people arriving? A plain count of visitors and where they came from. Not sessions sliced by twelve dimensions. Just: did anyone show up this week, and did the tweet, the launch post, the cold email move that count at all.",
        "Do they reach the one action that matters? Every product has a single moment that means someone got the point: started a trial, connected an account, sent the first message, published the first thing. Pick that one moment and count how many arrivals reach it.",
        "Where do they fall off before it? Between landing and that moment there are usually two or three steps. Look at how many people make it from each step to the next. The biggest gap is your only real to-do."
      ]
    },
    {
      "type": "p",
      "text": "That is a [conversion funnel](/glossary/conversion-funnel) with three or four steps, plus a traffic count. You do not need cohort retention, you do not need a warehouse, you do not need to name every button on the screen. You need to know whether strangers arrive and whether they get to the point. When my own first project had nine visitors a day, I tracked exactly two things: visits, and clicks on the one button that started the flow. That was enough to show me the button was fine and the traffic was the problem."
    },
    {
      "type": "h2",
      "text": "What a full event taxonomy costs you before revenue",
      "id": "taxonomy-cost"
    },
    {
      "type": "p",
      "text": "Here is the part that makes people defensive. A full event taxonomy at the pre-revenue stage is not free insurance you will be glad you bought later. It carries a real price, and you pay it in the currency you have least of."
    },
    {
      "type": "p",
      "text": "You pay in time: every event is a naming decision, a piece of code, a thing that breaks quietly when you refactor. You pay in false confidence: a wall of green numbers built on twenty visitors will happily show you a trend that is really three people and a bot. And you pay in attention, the one that actually kills companies. Hours spent perfecting how you would measure a funnel are hours not spent finding the ten users who would make the funnel real. Most of the vanity you later regret starts here, and I have argued before that [early dashboards tend to measure the wrong things](/blogs/vanity-metrics-are-lying)."
    },
    {
      "type": "p",
      "text": "There is a version of measurement discipline that is genuinely rigorous, and a version that is procrastination wearing rigor's clothes. The tell is simple. Rigor asks a question you will act on this week. Procrastination builds infrastructure for a question you cannot answer until you are ten times bigger. Before revenue, almost every elaborate tracking plan is the second thing."
    },
    {
      "type": "quote",
      "text": "Instrumentation you cannot act on is not data. It is a to-do list you wrote for a company you do not have yet.",
      "cite": "the rule I give every pre-revenue founder who asks"
    },
    {
      "type": "h2",
      "text": "The minimal setup I would actually run",
      "id": "minimal-setup"
    },
    {
      "type": "p",
      "text": "Concretely, here is what I put on a pre-revenue site, and nothing else:"
    },
    {
      "type": "ol",
      "items": [
        "One lightweight script for traffic and referrers. A free, privacy-friendly counter is completely fine at this stage. The paid tools, Conclick included, are overkill until you have paying customers to attribute, so do not reach for mine or anyone else's yet.",
        "Google Search Console, connected on day one. It is free, it is the only place you see the real search queries bringing people in, and the data starts filling the moment you verify. There is no good reason to skip it.",
        "Three to four funnel steps around your one key action: landing, the step just before the action, the action itself. If your tool does not do funnels, a spreadsheet with four weekly counts does the same job.",
        "A single conversion goal tied to that action, so the number you check every Monday is the one that means something, not raw pageviews."
      ]
    },
    {
      "type": "p",
      "text": "That is an afternoon of work and close to zero ongoing maintenance, and it answers all three questions. Notice what is not on the list: session recordings you will never watch, a heatmap of a page nobody visits yet, custom events for features half your users have not found, revenue charts with no revenue to put in them. Add none of it until something forces you to."
    },
    {
      "type": "h2",
      "text": "When should I add more analytics?",
      "id": "when-to-add"
    },
    {
      "type": "p",
      "text": "More measurement earns its place the moment a real decision depends on it, and not one step before. Here is the trigger list I use. Every item is a thing that has to actually happen, not a milestone you merely feel approaching."
    },
    {
      "type": "ul",
      "items": [
        "Add proper funnels and segments when you have enough traffic for the numbers to hold still. Roughly a few hundred people through each step per month; below that the percentages swing so hard they lie to you.",
        "Add heatmaps and session review when a specific page underperforms and the funnel cannot tell you why. The funnel finds the leaky step; you open a [click map](/guides/how-to-read-a-heatmap) for that one page, only once there is a step worth fixing.",
        "Add [SaaS revenue attribution](/for/saas) the day money first changes hands. At that moment, where paying customers came from stops being a vanity question and becomes the one that sets your budget. Not a day earlier.",
        "Add event tracking for a feature when you are deciding its future. About to cut something or double down on it? Instrument that one thing to make the call. Do not instrument all forty on the theory that one day you might ask.",
        "Add cohort retention when you genuinely have cohorts: enough signups spread across enough weeks that whether week-two users come back is a question with a real denominator."
      ]
    },
    {
      "type": "p",
      "text": "Every one of those is add-this-when-X-happens, where X is something you can observe. The mistake is building all of it up front against an X that has not arrived and may never, for a product that has not yet earned a single dollar."
    },
    {
      "type": "h2",
      "text": "What to ignore until you have paying customers",
      "id": "ignore-until-paying"
    },
    {
      "type": "p",
      "text": "Some numbers are not just premature before revenue, they are actively misleading, because they reward the wrong behaviour. [Bounce rate](/glossary/bounce-rate) on a two-page site tells you almost nothing and will send you redesigning a hero section when the real issue is that nobody has a reason to stay yet. Time on page, pages per session, and the rest of the engagement family are the same: they feel like health, and at ten visitors a day they are astrology."
    },
    {
      "type": "p",
      "text": "The one number that is never premature is whether a stranger did the thing. If people arrive and reach your key action, you have something real, and the move is to scale traffic. If they arrive and bail before it, you have a product or a positioning problem, and no amount of measurement fixes that. You fix it by talking to the people who bailed. Before revenue, the highest-leverage tool you own is a calendar link and a willingness to hear that the thing is confusing. Track three numbers, watch the one action, and spend the time you saved getting users, not grooming the dashboard that counts them."
    }
  ],
  "faq": [
    {
      "question": "Do I need Google Analytics for a pre-revenue startup?",
      "answer": "No, not specifically, and often not any heavy analytics stack yet. Any lightweight tool that gives you a traffic count and referrer sources is enough before you have paying customers. Google Search Console is the one free source I would connect on day one, because it shows the real search queries finding you."
    },
    {
      "question": "What is the minimum analytics setup before launch?",
      "answer": "A one-line traffic script, Google Search Console, and a three or four step funnel around your single most important action. That combination answers whether people arrive, whether they reach the key action, and where they drop off before it. It takes an afternoon, needs almost no upkeep, and everything beyond it can wait until a real decision depends on it."
    },
    {
      "question": "Is a full event tracking plan worth it early on?",
      "answer": "Rarely, and usually it is a way of avoiding harder work. A full event taxonomy costs real engineering time, produces confident-looking charts built on too few users to trust, and pulls attention away from getting those users in the first place. Instrument events for one feature only when you are about to make a decision about that feature."
    },
    {
      "question": "How much traffic do I need before funnels are useful?",
      "answer": "Roughly a few hundred people through each step per month before the percentages hold still. Below that, one or two people moving swings your conversion rate by double digits, and the funnel tells you stories instead of facts. At very low volume, a simple count of who reaches your key action teaches you more than a funnel split into unstable fractions."
    },
    {
      "question": "When should I add revenue attribution?",
      "answer": "The day your first payment clears, and not one day before. Once money changes hands, knowing which traffic and which campaign produced a paying customer becomes the number that sets your budget. Before there is any revenue to attribute, an attribution setup is just infrastructure for a question you cannot yet ask. It is worth real effort the moment it is answerable."
    },
    {
      "question": "What analytics actually matter for an early-stage startup?",
      "answer": "Whether people arrive, whether they reach your one key action, and where they fall off before it. Those three numbers are the analytics that matter for an early-stage startup before revenue; nearly everything else is noise at low volume. A traffic count, one funnel, one conversion goal. Scale the measurement up only when traffic and revenue give the extra numbers something real to describe."
    }
  ],
  "heroWord": "less",
  "category": "Metrics",
  "topics": [
    "metrics",
    "early stage",
    "measurement",
    "startups"
  ],
  "sources": [
    {
      "label": "Google Search Console help: overview",
      "url": "https://support.google.com/webmasters/answer/9128668"
    },
    {
      "label": "Y Combinator: The real measure of your growth",
      "url": "https://www.ycombinator.com/library"
    }
  ],
  "internalLinks": [
    {
      "href": "/blogs/metrics-early-saas-should-watch",
      "label": "Metrics early SaaS should watch",
      "group": "blog"
    },
    {
      "href": "/blogs/vanity-metrics-are-lying",
      "label": "Why vanity metrics lie to you",
      "group": "blog"
    },
    {
      "href": "/glossary/conversion-funnel",
      "label": "What a conversion funnel is",
      "group": "glossary"
    },
    {
      "href": "/guides/how-to-read-a-funnel",
      "label": "How to read a funnel",
      "group": "guide"
    },
    {
      "href": "/blogs/why-revenue-attribution-matters",
      "label": "Why revenue attribution matters",
      "group": "blog"
    },
    {
      "href": "/guides/filter-bot-traffic-from-analytics",
      "label": "Filter bot traffic from your data",
      "group": "guide"
    }
  ],
  "relatedTools": [],
  "leadMagnet": {
    "kind": "addWebsite",
    "headline": "Put this into practice",
    "sub": "Conclick gives you privacy-first analytics, heatmaps, funnels, and revenue attribution in one. Free for 14 days, no card.",
    "ctaLabel": "Add My Website"
  },
  "datePublished": "2026-07-24",
  "dateModified": "2026-07-24"
};

export default entry;
