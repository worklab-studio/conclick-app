import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "blog",
  "slug": "ab-testing-with-low-traffic",
  "h1": "How to A/B Test With Low Traffic Without Fooling Yourself",
  "metaTitle": "How to A/B Test With Low Traffic (Honestly)",
  "metaDescription": "At 500 visitors a month, most A/B tests are noise. Here is the honest math on sample size, why small-site winners vanish, and what to test instead.",
  "tldr": "At 500 visitors a month you usually cannot run a valid A/B test: the sample-size math needs tens of thousands of visitors per variation to catch the small lifts most tests chase, so detecting a 20 percent lift on a 3 percent rate takes years. Test bigger swings, judge the trend sequentially, and treat qualitative signals as real evidence instead of chasing significance.",
  "intro": "I build analytics for founders, and the most common way I watch a small site waste a quarter is a hopeful A/B test on traffic that could never settle it. You read the enterprise conversion playbooks, you split your homepage into two, you wait, and one day the tool flashes a winner. The trouble is that at your volume that winner is usually a coin flip dressed up as a result. So let me show you the honest math first, then what actually moves the needle when you have a few hundred visitors instead of a few hundred thousand.",
  "sections": [
    {
      "type": "h2",
      "text": "The short answer",
      "id": "the-short-answer"
    },
    {
      "type": "p",
      "text": "If you get around 500 visitors a month, the honest answer is that you usually cannot run a valid A/B test in any sane timeframe. The number of people you need to reliably detect the small lifts most tests chase runs into the tens of thousands per variation. At a few hundred visitors a month, the maths says years, not weeks. That does not mean you are stuck. It means you stop copying the enterprise playbook: test bigger changes, judge them with your eyes and your gut as much as a p-value, and treat qualitative signals as first-class evidence rather than a consolation prize."
    },
    {
      "type": "h2",
      "text": "The sample-size math nobody shows you",
      "id": "the-sample-size-math"
    },
    {
      "type": "p",
      "text": "Every A/B test is a bet that you can tell a real difference from random noise, and statistics gives you a way to size that bet. The rule of thumb experimenters use, from Ron Kohavi and colleagues who ran experimentation at Microsoft and Bing, is that you need roughly sixteen times the variance divided by the square of the effect you want to catch, per variation, for a standard 95 percent confidence and 80 percent power test. For a conversion rate that works out to about sixteen times your rate times one minus your rate, divided by the minimum lift you care about, squared."
    },
    {
      "type": "p",
      "text": "Put real numbers in. Say your landing page converts at 3 percent and you want to catch a 20 percent relative lift, which would be a genuinely good win. That is an absolute move from 3.0 to 3.6 percent. The formula asks for roughly fourteen thousand visitors per variation, close to twenty-eight thousand in total. Split 500 visitors a month evenly and each variation collects about 250 a month, so you are looking at the better part of five years to fill a single test. Want to catch a subtler 10 percent lift instead? The number climbs past fifty thousand per variation, and the timeline runs closer to two decades. I am not exaggerating for effect. That is what the arithmetic returns."
    },
    {
      "type": "callout",
      "text": "The counterintuitive part: the smaller the effect you want to detect, the more traffic you need, and it scales with the square. Halving the effect you chase roughly quadruples the sample. So chasing tiny wins is exactly the wrong game on a small site, and the button-colour tests you read about need enterprise volume to mean anything."
    },
    {
      "type": "h2",
      "text": "Why your winners keep disappearing",
      "id": "why-winners-disappear"
    },
    {
      "type": "p",
      "text": "There is a second trap that hits small sites harder, and it explains why so many founders swear a test won and then watched the win evaporate. It is called peeking. Most testing tools show you a live significance number, and the temptation is to stop the moment it crosses 95 percent. Evan Miller showed years ago why that is a disaster: if you check an ongoing experiment repeatedly and stop as soon as it looks significant, your real false-positive rate is not 5 percent, it is around 26 percent. You are more than five times as likely to crown a fake winner as you think you are."
    },
    {
      "type": "p",
      "text": "On a low-traffic site this is lethal, because your test runs for so long that you peek constantly, and every peek is another roll of the dice. Add regression to the mean, where an early lucky streak drifts back toward average as more data arrives, and you get the classic pattern: a bold early winner that quietly dies. The fix Miller gives is simple and unglamorous. Decide your sample size before you start, and do not believe the number until you reach it."
    },
    {
      "type": "ul",
      "items": [
        "Fix the sample size and the end date in advance, then leave the test alone until you hit them. No peeking, no early calls.",
        "If you genuinely need to monitor as data arrives, use an engine built for it. Optimizely's Stats Engine runs sequential testing that stays valid under continuous monitoring, and VWO's SmartStats uses a Bayesian sequential approach for the same reason. Both are designed to survive the peeking you would otherwise get punished for.",
        "Treat any result you reached by stopping the second it looked good as a hypothesis to re-run, not a conclusion to ship."
      ]
    },
    {
      "type": "h2",
      "text": "Even at scale, most ideas do not win",
      "id": "most-ideas-do-not-win"
    },
    {
      "type": "p",
      "text": "Here is the fact that should reframe the whole exercise. When Kohavi's team measured outcomes objectively at Microsoft and Bing, only about a third of well-designed experiments actually improved the metric they were built to move. Roughly a third did nothing, and a third made things worse. These are teams with near-infinite traffic and dedicated statisticians. If two out of three carefully chosen ideas fail even there, the notion that you will grind out reliable 10 percent wins on 500 visitors a month is a fantasy. Most of what a small site can measure is noise, and noise plus optimism produces confident, wrong decisions."
    },
    {
      "type": "quote",
      "text": "Only about a third of ideas improve the metric they were designed to improve. If it fails two times in three with unlimited traffic, the low-traffic version of that test is mostly measuring luck.",
      "cite": "paraphrasing Ron Kohavi's experimentation results at Microsoft and Bing"
    },
    {
      "type": "h2",
      "text": "What to do instead when traffic is scarce",
      "id": "what-to-do-instead"
    },
    {
      "type": "p",
      "text": "None of this means you fly blind. It means you swap statistical A/B testing for methods that actually work at your scale. The through-line is one virtue, and it is the reason patience sits at the top of this page: patience about what you can honestly conclude, paired with boldness about what you are willing to change."
    },
    {
      "type": "ul",
      "items": [
        "Test bigger swings. A brand-new page, a different offer, a halved price: changes large enough that a 50 percent difference is plausible need a fraction of the traffic to detect. A rewritten value proposition might move the needle far enough to see; a shade of blue never will.",
        "Judge sequentially with your head, not just the tool. Ship the change, watch the trend for a few weeks, and ask whether the direction is consistent and the size is meaningful. You are looking for an elephant, not a mouse, and an elephant does not need a significance test to spot.",
        "Treat qualitative signals as real evidence. Five session recordings, ten replies to a one-question survey, or a handful of support tickets teach you more at 500 visitors a month than a t-test ever could. Watch where people hesitate, then rewrite that exact spot.",
        "Instrument the outcome, not the click. A variant that lifts signups but drops paying customers is a loss, not a win. Follow the visit all the way to revenue before you call anything a success."
      ]
    },
    {
      "type": "h2",
      "text": "Where measurement fits, and where I fit",
      "id": "where-measurement-fits"
    },
    {
      "type": "p",
      "text": "I build Conclick, a privacy-first analytics tool on top of the open-source Umami engine, so treat this as the disclosure it is. Conclick is not an A/B testing platform, and I would be lying if I told you it made the sample-size problem go away. Nothing does. What good analytics gives a small site is the honest denominator: how many people actually saw each version, where they dropped off, and whether the change you shipped moved a real outcome like a signup or a payment rather than a vanity click. When you are judging a big change by trend and judgement instead of a p-value, that clean picture of the funnel is the difference between a decision and a guess. If all you need is to watch whether a bold change moved revenue, you do not need a testing engine at all, and I would rather say that than sell you one."
    }
  ],
  "faq": [
    {
      "question": "Can I run an A/B test with 500 visitors a month?",
      "answer": "For the small lifts most tests chase, no, not in a useful timeframe. Detecting a 20 percent relative improvement on a 3 percent conversion rate needs roughly fourteen thousand visitors per variation, which at 250 visitors per variation a month is years of waiting. You can still learn from bold changes, qualitative research, and watching real outcomes, but a classic statistically significant A/B test on that traffic is usually out of reach."
    },
    {
      "question": "How big a sample size do I need for an A/B test?",
      "answer": "The experimenter's rule of thumb is about sixteen times your baseline rate times one minus that rate, divided by the square of the smallest lift you want to detect, per variation, at 95 percent confidence and 80 percent power. The key lesson is that it scales with the square of the effect: halving the lift you chase roughly quadruples the visitors you need. Use a sample-size calculator with your own numbers before you start, not after."
    },
    {
      "question": "Is it okay to stop an A/B test as soon as it hits significance?",
      "answer": "No, and this is the mistake that wrecks most small-site tests. Evan Miller showed that if you watch an experiment and stop the moment it crosses 95 percent, your true false-positive rate is around 26 percent, more than five times what you assumed. Decide the sample size up front and wait, or use a tool with sequential statistics designed to survive continuous monitoring."
    },
    {
      "question": "Should I use Bayesian A/B testing on a low-traffic site?",
      "answer": "Bayesian methods and sequential engines like VWO's SmartStats or Optimizely's Stats Engine handle the peeking problem more gracefully, so they help. But no statistical method manufactures signal that is not there. If your traffic is too thin to separate a real lift from noise, no framework rescues the test. Bayesian is a better lens, not more data."
    },
    {
      "question": "What should I test instead when I have low traffic?",
      "answer": "Test changes big enough that the effect is large and obvious: a new offer, a different price, a completely rewritten page. Then judge the trend over a few weeks with your own eyes, and lean hard on qualitative evidence like session recordings and direct replies. Above all, measure the downstream outcome, whether the change produced signups or revenue, not just the surface click."
    }
  ],
  "heroWord": "patience",
  "category": "CRO",
  "topics": [
    "a/b testing",
    "cro",
    "statistics",
    "conversion rate"
  ],
  "sources": [
    {
      "label": "Evan Miller: How Not To Run An A/B Test (the 26.1% false-positive figure from peeking)",
      "url": "https://www.evanmiller.org/how-not-to-run-an-ab-test.html"
    },
    {
      "label": "Kohavi et al., Online Experimentation at Microsoft (only ~1/3 of ideas improve their target metric)",
      "url": "https://ai.stanford.edu/~ronnyk/ExPThinkWeek2009Public.pdf"
    },
    {
      "label": "37signals / Signal v. Noise: A/B Testing Tech Note on determining sample size (the 16 sigma-squared rule)",
      "url": "https://signalvnoise.com/posts/3004-ab-testing-tech-note-determining-sample-size"
    },
    {
      "label": "Optimizely: the story behind the Stats Engine (sequential testing, always-valid inference)",
      "url": "https://www.optimizely.com/insights/blogs/statistics-for-the-internet-age-the-story-behind-optimizelys-new-stats-engine/"
    },
    {
      "label": "VWO: SmartStats, a Bayesian sequential testing engine",
      "url": "https://vwo.com/why-us/technology/statistics/"
    }
  ],
  "internalLinks": [
    {
      "href": "/blogs/vanity-metrics-are-lying",
      "label": "Why vanity metrics lie",
      "group": "blog"
    },
    {
      "href": "/guides/how-to-read-a-funnel",
      "label": "How to read a funnel",
      "group": "guide"
    },
    {
      "href": "/glossary/conversion-funnel",
      "label": "Conversion funnel, explained",
      "group": "glossary"
    },
    {
      "href": "/blogs/metrics-early-saas-should-watch",
      "label": "Metrics early SaaS should watch",
      "group": "blog"
    },
    {
      "href": "/for/indie-hackers",
      "label": "Analytics for indie hackers",
      "group": "useCase"
    }
  ],
  "relatedTools": [],
  "leadMagnet": {
    "kind": "addWebsite",
    "headline": "Put this into practice",
    "sub": "Conclick gives you privacy-first analytics, heatmaps, funnels, and revenue attribution in one. Free for 14 days, no card.",
    "ctaLabel": "Add My Website"
  },
  "datePublished": "2026-07-22",
  "dateModified": "2026-07-22"
};

export default entry;
