import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "glossary",
  "slug": "bounce-rate",
  "h1": "Bounce Rate: What It Actually Means and When to Care",
  "metaTitle": "Bounce Rate Explained: Definition, Benchmarks & What to Do",
  "metaDescription": "Bounce rate measures the share of sessions where visitors leave without interacting further. Here's what it actually tells you, and what it doesn't.",
  "tldr": "Bounce rate is the percentage of sessions where a visitor lands on a page and leaves without triggering any further interaction: no click, no scroll event (depending on your tool), no second page. A high number is not inherently bad; it depends entirely on what the page is supposed to do.",
  "intro": "Most founders obsess over bounce rate the moment they install analytics. Then they spend weeks trying to lower a number that may not mean what they think. The metric is genuinely useful, but only when you understand exactly what your tool is measuring and what your page is actually for.",
  "sections": [
    {
      "type": "h2",
      "text": "The Definition",
      "id": "definition"
    },
    {
      "type": "p",
      "text": "Bounce rate = (single-page sessions / total sessions) × 100. A \"single-page session\" means the visitor came, the analytics script fired once, and then they left. No subsequent pageview was recorded in the same session."
    },
    {
      "type": "p",
      "text": "The key word is \"recorded.\" What counts as an interaction varies by tool. In Universal Analytics (Google Analytics 3), a bounce was simply leaving without a second pageview: reading your entire blog post, scrolling to the bottom, and clicking away still counted as one. Google Analytics 4 changed this by introducing \"engaged sessions\" (30+ seconds, or a conversion event, or two+ pages), which flipped the metric almost entirely. A page that UA reported at 75% bounce might show 35% in GA4 for exactly the same traffic."
    },
    {
      "type": "p",
      "text": "This means if you are comparing this metric across tools, or across a UA-to-GA4 migration boundary, you are almost certainly comparing different things. Always check what your specific tool considers an interaction, and how it defines a [session](/glossary/sessions-vs-visitors), before drawing conclusions."
    },
    {
      "type": "h2",
      "text": "Why It Matters, and When It Doesn't",
      "id": "why-it-matters"
    },
    {
      "type": "p",
      "text": "The number is a proxy for fit between the visitor's intent and what your page delivers. It matters when it signals a mismatch: the wrong traffic, a broken page, a headline that promises something your content doesn't deliver, or a page that loads so slowly the visitor gives up."
    },
    {
      "type": "p",
      "text": "It does not matter much when the page's job is to give one answer and send the visitor away. A contact page with a phone number, a blog post that answers a specific question, a documentation page that explains one concept: all of these can show high bounce numbers and be doing their jobs perfectly. The visitor got what they needed."
    },
    {
      "type": "p",
      "text": "Where bounce rate genuinely hurts you: landing pages meant to push people into a trial, pricing pages meant to convert, or any page in the middle of a funnel. If 90% of people who land on your pricing page leave without clicking anything, that's a real signal that something about the page is not working."
    },
    {
      "type": "callout",
      "text": "The single most common mistake in web analytics: chasing a lower bounce number on a blog post. If someone reads your 1,200-word article start to finish and leaves satisfied, that's a success. That's also, in many tools, a bounce. Don't confuse activity with value."
    },
    {
      "type": "h2",
      "text": "What's a Good Bounce Rate? Benchmarks by Page Type",
      "id": "benchmarks"
    },
    {
      "type": "p",
      "text": "There is no universal \"good\" bounce rate. The number varies dramatically by page type, traffic source, and industry. Rough benchmarks based on industry data:"
    },
    {
      "type": "ul",
      "items": [
        "Landing pages (paid traffic, trial CTAs): 40 to 60% is reasonable. Above 70% warrants investigation.",
        "Blog / content pages: 65 to 90% is normal. Readers read and leave. That's fine.",
        "E-commerce category and product pages: 30 to 55%. Shoppers browse.",
        "Pricing pages: 50 to 70%. Some people are just price-checking. Watch the conversion rate here more than the bounces.",
        "Home page: 40 to 60%. High variance depending on how much navigation is on the page.",
        "Contact / support pages: 60 to 80%. They found what they needed."
      ]
    },
    {
      "type": "p",
      "text": "Organic search traffic bounces more than direct traffic. Mobile bounces more than desktop (usually; it depends on page design). Social traffic often bounces the most. None of these are automatically problems. Segment before you panic."
    },
    {
      "type": "h2",
      "text": "How to Measure and Interpret It Correctly",
      "id": "how-to-measure"
    },
    {
      "type": "h3",
      "text": "Segment by traffic source",
      "id": "segment-by-traffic-source"
    },
    {
      "type": "p",
      "text": "An aggregate bounce rate is almost meaningless. Break it down. If your paid Google Ads traffic bounces at 80% and your email list bounces at 30%, those are two completely different problems. The first might mean your ad copy doesn't match the page. The second might mean your email subscribers are qualified and engaged. Averaging them together tells you nothing."
    },
    {
      "type": "h3",
      "text": "Pair it with time-on-page",
      "id": "pair-it-with-time-on-page"
    },
    {
      "type": "p",
      "text": "A 90% bounce with a four-minute average time-on-page suggests people are reading. The same 90% with a 12-second average suggests something is broken or deeply irrelevant. These are opposite diagnoses. Most analytics tools show both. Use both."
    },
    {
      "type": "h3",
      "text": "Look at what happens after low-bounce pages",
      "id": "look-at-what-happens-after-low-bounce-pages"
    },
    {
      "type": "p",
      "text": "A low bounce rate just means people clicked somewhere. It doesn't mean they converted. Track what happens after the click. A page bouncing at 20% that leads people to a dead-end second page is worse than one at 60% that gets the 40% who stay to actually buy."
    },
    {
      "type": "h2",
      "text": "Common Mistakes Founders Make",
      "id": "common-mistakes"
    },
    {
      "type": "ol",
      "items": [
        "Treating it as a single site-wide KPI. Segment. Always segment.",
        "Comparing across tools without checking definitions. GA4 and a cookieless tool measure different things. Neither is wrong, they're different.",
        "A/B testing page elements just to move the bounce number, without checking whether the change moves revenue.",
        "Ignoring mobile vs. desktop splits. A page designed only for desktop often has brutal mobile bounce numbers, and mobile is now 60%+ of web traffic for many sites.",
        "Not accounting for [bot traffic](/guides/filter-bot-traffic-from-analytics). Bots can inflate or deflate the numbers in ways that look meaningful but aren't.",
        "Forgetting that some bounces are intentional. A visitor who clicks your 'Download PDF' button and then closes the tab is a success, not a bounce. Most analytics tools will record it as one, though, unless you've set up a download event."
      ]
    },
    {
      "type": "h2",
      "text": "A Note on Tooling",
      "id": "conclick-note"
    },
    {
      "type": "p",
      "text": "Most analytics tools give you the number. Fewer help you understand why people are bouncing on a specific page. If a landing page is bouncing hard, my first instinct isn't to run an A/B test blindly: it's to watch a [heatmap and scroll map](/guides/how-to-read-a-heatmap) of that page. Where do people stop scrolling? Are they clicking things that aren't links (dead clicks)? Are they rage-clicking something in frustration?"
    },
    {
      "type": "p",
      "text": "That's part of the reason I built Conclick to include real-screenshot heatmaps alongside standard analytics. Bounce rate tells you something is wrong. Click maps and scroll depth show you where. If you're diagnosing a leaky funnel page, Conclick also auto-detects drop-offs in your funnel and shows you the revenue estimate of what you're losing, so you know whether fixing that 70%-bounce landing page is worth a week of your time or not."
    }
  ],
  "faq": [
    {
      "question": "What is a good bounce rate for a SaaS landing page?",
      "answer": "For a landing page with a clear conversion goal (trial signup, demo request), you generally want bounce rate below 60%. Above 70% on paid traffic is worth investigating immediately, because you're paying for clicks that leave without doing anything. That said, the more important number is conversion rate; a 65% bounce with a 4% conversion beats a 40% bounce with a 1% conversion every time."
    },
    {
      "question": "Is a high bounce rate bad for SEO?",
      "answer": "Not directly. Google has said the bounce metric from Google Analytics is not a ranking signal, and its ranking systems do not use your GA data. What does affect rankings is pogo-sticking: a user clicks your result, bounces back to Google, and clicks a different result. That signals to Google your page didn't satisfy the query. A high number does not necessarily mean pogo-sticking; someone could read your page thoroughly and close the tab. Focus on genuinely answering search intent rather than gaming the metric."
    },
    {
      "question": "How is bounce rate different in GA4 versus Universal Analytics?",
      "answer": "In Universal Analytics, bounce rate measured the percentage of single-page sessions with no further pageview. In GA4, the equivalent metric is the inverse of 'engagement rate': a session is engaged if it lasts 10+ seconds (configurable), includes a conversion event, or includes two or more pageviews. This means GA4 numbers are almost always lower than UA numbers for the same traffic. If you migrated from UA to GA4 and the metric dropped dramatically, that's likely a definitional change, not an improvement in user behavior."
    },
    {
      "question": "Why does my bounce rate show 0% or 100%?",
      "answer": "A 0% bounce rate almost always means your analytics tag is firing twice on the same page: a double-install, or a tag manager misconfiguration that sends two pageview events. Every session looks like two pages, so nothing looks like a bounce. A 100% reading can mean the opposite: the script only fires on the landing page (maybe it's missing from all your other pages). Both are measurement errors, not real user behavior. Check your tag implementation first."
    },
    {
      "question": "Does bounce rate matter for e-commerce product pages?",
      "answer": "Yes, more than for content pages. A product page that bounces at 80% means 80% of people who land on that product leave without adding to cart or clicking elsewhere. That's a real conversion problem. Common causes: the product isn't what the ad or search result implied, the price is surprising, there's no social proof visible above the fold, or the page loads slowly on mobile. Pair it with scroll depth data on product pages to see whether people are even seeing your price and CTA."
    },
    {
      "question": "Can I lower bounce rate by adding an exit-intent popup?",
      "answer": "Technically yes: if someone interacts with a popup before leaving, some tools won't record it as a bounce. But you'd be engineering the metric rather than fixing the underlying problem. Exit-intent popups can recover a small percentage of abandoning visitors when done well, but they're annoying to most people and can damage brand perception. A better use of that energy is understanding why people are leaving in the first place, using heatmaps and scroll data, and fixing the page itself."
    }
  ],
  "internalLinks": [
    {
      "href": "/glossary/sessions-vs-visitors",
      "label": "Sessions vs Visitors: What Each One Tells You",
      "group": "glossary"
    },
    {
      "href": "/guides/how-to-read-a-heatmap",
      "label": "How to Read a Heatmap",
      "group": "guide"
    },
    {
      "href": "/guides/filter-bot-traffic-from-analytics",
      "label": "How to Filter Bot Traffic from Your Analytics",
      "group": "guide"
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
