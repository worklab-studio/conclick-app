import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "open-source-web-analytics-tools",
  "h1": "Open Source Web Analytics Tools I Trust in 2026: An Honest List",
  "metaTitle": "Open Source Web Analytics Tools: The Honest 2026 List",
  "metaDescription": "I ship on the Umami engine and rely on the others daily. Here are the open source web analytics tools worth self-hosting in 2026, with real trade-offs.",
  "tldr": "The open source web analytics tools worth adopting in 2026 are Matomo, Plausible Community Edition, Umami, and PostHog, each fitting a different team shape. I ship on the Umami engine and use two of the others weekly. Pick by what you need to run, not by star count.",
  "intro": "I have spent two years building on top of an open source web analytics engine, and the year before that I compared every serious option from a spreadsheet at 3am. So this is not neutral, and I will not pretend it is. It is my honest read on the open source web analytics tools worth adopting in 2026, when to reach for each, and where the free download stops being free.",
  "sections": [
    {
      "type": "h2",
      "text": "What counts as open source web analytics",
      "id": "what-counts"
    },
    {
      "type": "p",
      "text": "There is a difference between open source and source-available that a lot of comparison posts wave past, and it decides what you can actually do with the code. Open source under an OSI-approved license (MIT, GPL, MPL, Apache) means you can self-host, fork, modify, and redistribute without paying for a commercial license. Source-available means the code is on GitHub, you can read it, but the license says you cannot run it as a competing service, or you owe the vendor a fee at a certain scale. Both models can be fine. They are not the same product."
    },
    {
      "type": "p",
      "text": "The four tools below are all genuinely open source under permissive or copyleft licenses. When a competitor is source-available or dual-licensed I say so, because a small SaaS that self-hosts on a source-available license and later builds a paid product on top can wake up with a license violation nobody warned them about."
    },
    {
      "type": "h2",
      "text": "The four open source web analytics tools I trust",
      "id": "the-four"
    },
    {
      "type": "p",
      "text": "Every general-purpose analytics tool below has a real user base, a maintained repo, and someone paid to fix bugs when they land. That is a lower bar than it sounds. I removed three projects from my shortlist this cycle because their last commit was in 2024 and their Docker image will not pull cleanly on a modern host."
    },
    {
      "type": "h3",
      "text": "Matomo: the closest full replacement for GA4",
      "id": "matomo"
    },
    {
      "type": "p",
      "text": "Matomo is the oldest and deepest tool on this list, licensed GPL v3, self-hostable on any PHP stack. It ships ecommerce reports, goals, funnels, custom dimensions, a tag manager, and Multi Channel Conversion Attribution across six models. Per matomo.org the Multi Channel plugin is a paid add-on for self-hosted installs, though bundled in Matomo Cloud. Heatmaps and session recordings are a paid premium plugin too, so you should think of the free download as the traffic core, not the whole platform. If your priority is a genuine GA4 replacement with data you fully own, this is the honest answer, and I would still pick it for any organisation with regulatory obligations that cannot leave the EU. See how it stacks up in my [Conclick vs Matomo comparison](/vs/matomo)."
    },
    {
      "type": "h3",
      "text": "Plausible Community Edition: minimal, opinionated, privacy-first",
      "id": "plausible-ce"
    },
    {
      "type": "p",
      "text": "Plausible Community Edition is the self-hosted, AGPL-licensed build of Plausible Analytics. Per plausible.io the hosted version funds development, and the CE build is a subset that runs on your own box with Docker. It counts pageviews, sessions, referrers, custom events and outbound clicks, and it does it fast on a small script. There are no heatmaps, no funnels beyond basic goal counting, and no revenue attribution. That is the point. If you run a marketing site or a content project and you want a dashboard your team can read on a phone during standup, Plausible CE is the least surprising choice. My honest [Conclick vs Plausible comparison](/vs/plausible) covers where it falls short if you are running a paid product."
    },
    {
      "type": "h3",
      "text": "Umami: the traffic engine I chose to build on",
      "id": "umami"
    },
    {
      "type": "p",
      "text": "Umami is MIT-licensed, Postgres or MySQL-backed, ships as a single Next.js app, and installs in about ten minutes on any modern host. It is fast, cookieless by default with a first-party identifier, and its schema is clean enough to extend. Full disclosure: Conclick is built on the Umami codebase, so I have opinions about its trade-offs that are worth stating rather than hiding. The upside is a small, auditable core with an active maintainer and a real community. The downside is that out of the box Umami is a traffic tool. It does not do heatmaps, funnels beyond simple event chains, or revenue attribution. If your job is counting visits and events cleanly and you want the software to stay small, install it today. If you need behaviour or money in the same view, you will either extend it or reach for something bigger. My side-by-side is at [Conclick vs Umami](/vs/umami)."
    },
    {
      "type": "h3",
      "text": "PostHog: product analytics if you will write the code",
      "id": "posthog"
    },
    {
      "type": "p",
      "text": "PostHog is MIT-licensed for the core and source-available for the enterprise features, and per posthog.com it is genuinely self-hostable, though the recommended production topology is heavy: Kafka, ClickHouse, Zookeeper, Redis and Postgres, plus workers. It does event capture, funnels, retention, session replay, feature flags, experiments and a Stripe connector. Two honest caveats. First, per their docs PostHog is removing the standalone Revenue analytics dashboard on or after June 30, 2026, moving revenue onto person and group properties you query yourself. Second, self-hosting PostHog is a real infrastructure job, and most small teams who try end up paying for cloud within a quarter. Excellent when you have engineering capacity. Overkill for a solo founder who wants a dashboard by Friday."
    },
    {
      "type": "h2",
      "text": "What self-hosting actually costs you",
      "id": "self-hosting-cost"
    },
    {
      "type": "p",
      "text": "The sticker price of an open source tool is zero. The operational cost is not. I have watched small teams treat self-hosting as a cost saving and then quietly write off a month of engineering across a year keeping it alive. The honest bill has four lines: the host you run it on, the Postgres or ClickHouse behind it, the person on call when the disk fills up on a Sunday, and the security patches you either apply or ignore."
    },
    {
      "type": "ul",
      "items": [
        "Host: a $10 to $40 a month VPS runs Umami or Plausible CE for a mid-traffic site. Matomo needs a little more if you install premium plugins. PostHog production is closer to $200 a month before you count storage.",
        "Database: budget for backups you actually restore-test. A backup nobody has restored is a superstition, not a backup.",
        "Time: expect two to four hours a month steady state, and a full day whenever the upstream project ships a major release.",
        "Security: subscribe to the project's security advisory feed. A CVE in an analytics tool that is publicly reachable is not a small incident."
      ]
    },
    {
      "type": "p",
      "text": "This is where the honest answer for many founders is that hosted Plausible, or hosted Umami Cloud, or a $9 a month tool like the one I run, is cheaper than what a proper self-hosted deployment costs in total. It is worth doing the math before committing to the ops work, not after."
    },
    {
      "type": "h2",
      "text": "How should you pick one?",
      "id": "how-to-pick"
    },
    {
      "type": "p",
      "text": "Here is the decision tree I actually use when someone asks me privately. If you need a real GA4 replacement with ecommerce reporting and you have PHP-comfortable ops, install Matomo. If you run a marketing site or content project and you want the smallest, calmest dashboard, install Plausible CE. If you want a lean, extensible traffic engine you can build on, install Umami. If you have engineers and your real questions are about product usage, session replay and feature flags, install PostHog and budget the machines. If none of those match your team, the honest answer is that hosted analytics is the right buy and open source is a story you tell yourself."
    },
    {
      "type": "p",
      "text": "A useful cross-reference is my [revenue attribution tools guide](/guides/revenue-attribution-tools), which covers the payment-first tools that stitch charges to sources. None of the four above do that well out of the box, and if the question you need answered is which channel makes you money, a general open source tool is not where I would start."
    },
    {
      "type": "callout",
      "text": "Any project whose last real commit was more than nine months ago is off my shortlist, regardless of star count. An abandoned analytics tool is not a bargain, it is a slow-motion outage that stops collecting data the week you most need it."
    },
    {
      "type": "h2",
      "text": "Where open source is the wrong answer",
      "id": "wrong-answer"
    },
    {
      "type": "p",
      "text": "Open source is not a moral position, it is a set of trade-offs, and there are shapes of team where the trade-offs go the wrong way. If you are a solo founder pre-revenue, the days you spend fiddling with a self-hosted install are days not spent on the product. If you need revenue attribution across Stripe or Paddle, most of these tools require real integration work you probably do not want to do. If your compliance team wants a signed DPA and named subprocessors, open source alone does not give you that, and the hosting provider becomes the answer either way."
    },
    {
      "type": "p",
      "text": "The right question is not open source versus proprietary. It is where your team wants to spend attention. Every hour I spent on database migrations for an analytics service was an hour I did not spend on the product that pays my rent. That is the math the community rarely puts on the pricing page."
    },
    {
      "type": "quote",
      "text": "The best open source analytics tool is the one you will still be running in eighteen months. Software that quietly stops collecting data is worse than software that costs money.",
      "cite": "Deepak, founder of Conclick"
    }
  ],
  "faq": [
    {
      "question": "What is the best open source web analytics tool in 2026?",
      "answer": "There is no single best one, and anyone naming one without asking about your stack is selling. For a full GA4 replacement with ecommerce reporting, Matomo is the deepest option. For a minimal privacy-first traffic dashboard, Plausible Community Edition is the calmest. For a small extensible engine to build on, Umami. For product analytics with session replay, PostHog if you can staff the ops."
    },
    {
      "question": "Is Google Analytics open source?",
      "answer": "No, Google Analytics is not open source at any level. Neither the client script, the ingestion pipeline, nor the reporting layer is public code you can inspect or self-host. The free tier is a hosted product with usage caps, and the enterprise tier is a paid contract. If open source is a requirement for you, GA4 does not qualify."
    },
    {
      "question": "Is Plausible fully open source?",
      "answer": "Plausible ships two editions. The hosted product is closed to your inspection, and Plausible Community Edition is a self-hostable AGPL v3 build with a subset of the hosted features. Per plausible.io the hosted revenue funds development of both. If you need the current hosted feature set exactly, self-hosting will lag it, and that is by design."
    },
    {
      "question": "Can I self-host analytics without a DevOps engineer?",
      "answer": "For Umami and Plausible Community Edition, yes, most reasonably technical founders can install and run them from a Docker image on a $10 VPS. For Matomo, plan for a weekend of setup and a checklist of PHP tuning. For PostHog, honestly, no. The production topology involves Kafka and ClickHouse and it is a real infrastructure job that most solo teams should not take on."
    },
    {
      "question": "What is the difference between open source and source-available?",
      "answer": "Open source under an OSI-approved license lets you self-host, fork and redistribute the code, including for commercial use, subject to license terms. Source-available means the code is public but the license restricts commercial use, redistribution, or running it as a competing service. It matters because a small SaaS that self-hosts on a source-available license can violate that license at scale without realising it."
    },
    {
      "question": "Is Umami still actively maintained?",
      "answer": "Yes, Umami has an active maintainer, a commercial Umami Cloud that funds the work, and regular releases through 2025 and into 2026. The MIT license and the small codebase are why I chose to build Conclick on top of it. As with any open source project, subscribe to the release feed and read the changelog before upgrading in production."
    }
  ],
  "heroWord": "open.",
  "category": "Measurement",
  "topics": [
    "open-source",
    "self-hosting",
    "privacy",
    "analytics"
  ],
  "sources": [
    {
      "label": "Matomo: Multi Channel Conversion Attribution user guide",
      "url": "https://matomo.org/guide/reports/multi-channel-conversion-attribution/"
    },
    {
      "label": "Matomo: premium features and pricing for self-hosted",
      "url": "https://matomo.org/pricing/"
    },
    {
      "label": "Plausible Community Edition on GitHub",
      "url": "https://github.com/plausible/community-edition"
    },
    {
      "label": "Umami analytics on GitHub",
      "url": "https://github.com/umami-software/umami"
    },
    {
      "label": "PostHog: self-hosting production deployment",
      "url": "https://posthog.com/docs/self-host"
    },
    {
      "label": "PostHog: Revenue analytics dashboard removal notice",
      "url": "https://posthog.com/docs/revenue-analytics"
    }
  ],
  "internalLinks": [
    {
      "href": "/vs/matomo",
      "label": "Conclick vs Matomo, side by side",
      "group": "comparison"
    },
    {
      "href": "/vs/plausible",
      "label": "Conclick vs Plausible, side by side",
      "group": "comparison"
    },
    {
      "href": "/vs/umami",
      "label": "Conclick vs Umami, side by side",
      "group": "comparison"
    },
    {
      "href": "/guides/revenue-attribution-tools",
      "label": "Revenue attribution tools compared",
      "group": "guide"
    },
    {
      "href": "/glossary/cookieless-analytics",
      "label": "Cookieless analytics, defined",
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
  "datePublished": "2026-07-23",
  "dateModified": "2026-07-23"
};

export default entry;
