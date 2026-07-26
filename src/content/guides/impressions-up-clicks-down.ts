import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "impressions-up-clicks-down",
  "h1": "Search Console Impressions Up but Clicks Down: How to Read It",
  "metaTitle": "Impressions Up but Clicks Down in Search Console",
  "metaDescription": "Rising impressions with falling clicks usually means an AI Overview is answering the query for you. How to read it in Search Console and what to fix.",
  "primaryKeyword": "search console impressions up but clicks down",
  "tldr": "Rising impressions with flat or falling clicks is usually the great decoupling: Google shows your page more often, often inside an AI Overview that answers the query so nobody clicks through. Read it in Search Console by checking that average position held steady, segmenting by query, and separating a title problem from a SERP-feature problem.",
  "intro": "I watch this pattern hit almost every small site I help, and it scares people more than it should. Your Search Console graph shows the impressions line climbing while the clicks line flattens or dips, and the natural read is that something broke. Usually nothing broke. Google is showing your page to more people and answering more of them before they ever reach you. That gap has a name now, and once you can read it you stop panicking and start fixing the part you actually control.",
  "sections": [
    {
      "type": "h2",
      "text": "The short answer",
      "id": "the-short-answer"
    },
    {
      "type": "p",
      "text": "Rising impressions with falling clicks is usually the great decoupling, not a ranking collapse. Google is surfacing your pages for more searches, so the number of times you appear keeps growing. But more of those searches now get answered on the results page itself, most often by an AI Overview sitting above the blue links, so a smaller share of the people who see you actually come through. The first thing to check is your average position. If it held steady or improved while traffic fell, you did not lose rankings, you lost the click."
    },
    {
      "type": "p",
      "text": "The fix depends on which of two very different problems you have. Either the result Google shows is not compelling enough to earn the visit it used to, which is a title and description problem you can fix in an afternoon. Or a feature on the page is intercepting people before they reach any organic result, which is a structural shift you manage rather than fix. Most of this piece is about telling those two apart inside Search Console, because the wrong diagnosis wastes weeks."
    },
    {
      "type": "h2",
      "text": "Why the two lines came apart",
      "id": "why-the-lines-came-apart"
    },
    {
      "type": "p",
      "text": "For most of search history, impressions and clicks moved together. More appearances meant more visits, at a fairly stable rate. AI Overviews broke that link. When Google generates a summary at the top of the page, it answers the query in place and cites a handful of sources, and the data on what happens next is blunt."
    },
    {
      "type": "p",
      "text": "The Pew Research Center tracked the browsing of 900 US adults across roughly 69,000 Google searches in March 2025. On results pages with an AI summary, people opened a traditional search link in 8 percent of visits, against 15 percent on pages without one. The sources cited inside the summary itself were opened in just 1 percent of visits. Ahrefs, looking at 300,000 keywords, found that the presence of an AI Overview correlated with a 34.5 percent lower click-through rate for the top organic result. Different methods, same direction: the appearance still counts, the visit often does not."
    },
    {
      "type": "callout",
      "text": "This is not a penalty and it is not your fault. A page that ranks first and gets summarised is doing its job so well that Google answers the searcher without sending them anywhere. Frustrating, but it is not a signal that your SEO is failing."
    },
    {
      "type": "h2",
      "text": "How Search Console actually counts an AI Overview",
      "id": "how-gsc-counts-an-ai-overview"
    },
    {
      "type": "p",
      "text": "You cannot diagnose this without knowing how the numbers are built, and the counting rules for AI features are specific. Google documents them, and they explain a lot of the weirdness people see in their reports."
    },
    {
      "type": "ul",
      "items": [
        "An AI Overview occupies a single position. Every link inside it is assigned that same position, so a page cited in the Overview is recorded at whatever slot the Overview holds, usually the very top of the page.",
        "A link only becomes an impression once it is scrolled or expanded into view, following the same visibility rule as any other result. If the summary stays collapsed and the searcher never opens it, the links inside may not register at all.",
        "Opening a link to an external page from inside an AI Overview counts as a click, exactly like a blue link. So the visits you do get from Overviews are already in your totals, mixed in rather than broken out.",
        "In AI Mode, a follow-up question is treated as a brand new query. Its impressions, position and clicks are attributed to that new query rather than the original one."
      ]
    },
    {
      "type": "p",
      "text": "Two things follow from this. First, because the Overview sits at position one and your cited page inherits that slot, your average position can actually improve at the same moment your traffic falls, which is the exact fingerprint of the decoupling. Second, Google added dedicated reporting in June 2025 that isolates impressions on AI surfaces, but the everyday Performance table still blends Overview appearances into your normal rows, so you rarely get a clean per-query AI number. You infer it from the shape of the data instead."
    },
    {
      "type": "h2",
      "text": "Title problem or SERP-feature problem: telling them apart",
      "id": "title-vs-serp-feature"
    },
    {
      "type": "p",
      "text": "Here is the actual diagnostic. Both problems look identical at the top level, a widening gap between two lines, so you have to segment before you can act. I do it in this order, and I do the whole thing inside the Search Console Performance report."
    },
    {
      "type": "ol",
      "items": [
        "Check average position first. Filter to the queries that lost traffic and look at their position over the same window. If position got worse, this is not the decoupling at all, it is a ranking slide, and you fix it the usual way with better content and links. If position held or improved, keep going.",
        "Split queries by intent. AI Overviews overwhelmingly appear on informational searches: how, what, why, best way to, questions with no obvious commercial action. Sort your query list and see where the loss concentrates. If the bleeding is almost all on question-shaped queries while your commercial and branded terms are fine, that is a SERP-feature story.",
        "Read click-through rate per query, not in aggregate. Take a query that still ranks in the top three and compare its rate now versus six months ago. If it slid from double digits to low single digits while position stayed put, a feature is intercepting people above you. If the rate fell only slightly and evenly across everything, your result itself is the weak link, and that is a title and description job.",
        "Open the results page for your worst-hit queries and look. Nothing beats actually searching the query in an incognito window and seeing whether an AI Overview, a featured snippet, or a stack of ads is sitting above you. Two minutes of looking beats an hour of guessing."
      ]
    },
    {
      "type": "p",
      "text": "The dividing line is simple once you have segmented. Stable position plus a falling rate concentrated on informational, question-shaped queries with a visible AI Overview is a SERP-feature problem. A rate that fell evenly across queries where nothing changed above you, especially on commercial and branded terms, is a title and meta problem. They need opposite responses, which is why guessing is expensive."
    },
    {
      "type": "h2",
      "text": "What to actually do about each",
      "id": "what-to-do"
    },
    {
      "type": "p",
      "text": "If it is a title and description problem, this is the good news case, because you own the fix. Rewrite the title to match the searcher's exact phrasing and lead with the specific thing they want, not your brand. Write a description that promises something the AI summary cannot: a number, a template, a tool, a strong opinion. You are competing for the attention of someone who has already read a generic answer, so generic loses."
    },
    {
      "type": "p",
      "text": "If it is a SERP-feature problem, you stop trying to win back the visit that is gone and change what you measure. The searches AI Overviews swallow are the low-intent, purely informational ones, the queries that rarely converted anyway. Your job becomes ranking for the searches that still send traffic, the ones with commercial intent where people want to compare, buy, or sign up, and being the source the Overview cites so your brand still registers even on a zero-click view."
    },
    {
      "type": "ul",
      "items": [
        "Shift reporting from impressions to outcomes. Impressions were always a soft number, and in a decoupled world they are close to meaningless. Track the visits that arrive and what they do next.",
        "Follow the visit past the landing page. One arrival from a high-intent query that ends in a signup is worth a hundred informational appearances that were never going to convert. Measure the thing you actually want.",
        "Watch branded search. If AI Overviews are introducing people to you without a click, branded query impressions should rise over the following weeks. That is the second-order value of being cited, and it shows up in Search Console if you look for it."
      ]
    },
    {
      "type": "quote",
      "text": "The appearance still counts, the visit often does not. Once you accept that, you stop optimising for a number that no longer buys you anything.",
      "cite": "the working rule I give every founder who brings me this graph"
    },
    {
      "type": "h2",
      "text": "Where Conclick fits",
      "id": "where-conclick-fits"
    },
    {
      "type": "p",
      "text": "I build Conclick, so read this as the pitch it is. Search Console tells you how you appear in Google, and it is the right and only tool for the impressions and clicks question on this page. What it cannot tell you is what the visit did after it landed. That is the gap I care about, because in a decoupled world the only clicks worth anything are the ones that turn into something."
    },
    {
      "type": "p",
      "text": "Conclick is a privacy-first analytics tool built on the open-source Umami engine. It ties a visit back to the source and campaign that produced it and forward to whether that visitor paid. So when Search Console shows you which queries still earn traffic, Conclick shows you which of that traffic earns a customer. That is the honest division of labour: keep Search Console for the results page, use something that follows the money for everything after it. If all you need is the diagnosis above, you can do the whole thing in Search Console for free, and I would rather tell you that than pretend you need me."
    }
  ],
  "faq": [
    {
      "question": "Is impressions up and clicks down bad for SEO?",
      "answer": "Usually not. If your average position held steady or improved while clicks fell, you did not lose rankings, you lost the visit to something on the results page, most often an AI Overview answering the query in place. That is the great decoupling, and it is a measurement and strategy problem, not a penalty. It only signals a real ranking issue if average position also got worse, which points to a slide rather than a feature."
    },
    {
      "question": "How do I know if AI Overviews are causing my click drop?",
      "answer": "Segment in Search Console. Filter to the queries that lost traffic, confirm their average position is stable, then check whether the loss is concentrated on informational, question-shaped searches. Then search a few of those queries in an incognito window and look for an AI Overview above the organic results. Stable position plus a falling rate on informational queries with a visible Overview is the signature."
    },
    {
      "question": "Do clicks from AI Overviews show up in Search Console?",
      "answer": "Yes. Google counts a click on an external link inside an AI Overview the same as a click on a blue link, so those visits are already in your totals. They are mixed into your normal rows rather than broken out. Google added dedicated AI-surface impression reporting in June 2025, but the everyday Performance report still blends Overview appearances into your standard query and page data."
    },
    {
      "question": "Can I fix falling click-through rate by rewriting my title and description?",
      "answer": "Only if the cause is your result, not a feature above it. If the rate fell evenly across queries where nothing changed above you, a sharper title and a more specific description will win visits back. If the drop is concentrated on queries that now trigger an AI Overview, a better title helps at the margin but cannot beat an answer that removed the reason to click at all. Diagnose first, rewrite second."
    },
    {
      "question": "What is the great decoupling in Search Console?",
      "answer": "It is the pattern where impressions rise while clicks stay flat or fall. Google shows your pages for more searches, but a growing share of those searches get answered on the results page itself, usually by an AI Overview, so fewer of the people who see you click through. The term spread through the SEO community in 2025 as AI Overviews became widespread, and Google has publicly acknowledged the split."
    }
  ],
  "heroWord": "decoupling",
  "category": "SEO",
  "topics": [
    "search console",
    "ai overviews",
    "seo",
    "click-through rate"
  ],
  "sources": [
    {
      "label": "Pew Research Center: Google users are less likely to click on links when an AI summary appears (22 July 2025)",
      "url": "https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/"
    },
    {
      "label": "Ahrefs: AI Overviews Reduce Clicks by 34.5%",
      "url": "https://ahrefs.com/blogs/ai-overviews-reduce-clicks/"
    },
    {
      "label": "Google Search Console Help: What are impressions, position, and clicks? (AI Overviews and AI Mode counting)",
      "url": "https://support.google.com/webmasters/answer/7042828?hl=en"
    },
    {
      "label": "Search Engine Land: Google AI Mode traffic data comes to Search Console",
      "url": "https://searchengineland.com/google-ai-mode-traffic-data-search-console-457076"
    }
  ],
  "internalLinks": [
    {
      "href": "/blogs/vanity-metrics-are-lying",
      "label": "Why vanity metrics lie",
      "group": "blog"
    },
    {
      "href": "/glossary/marketing-attribution",
      "label": "Marketing attribution, explained",
      "group": "glossary"
    },
    {
      "href": "/blogs/why-revenue-attribution-matters",
      "label": "Why revenue attribution matters",
      "group": "blog"
    },
    {
      "href": "/tools/utm-builder",
      "label": "Build clean UTM links",
      "group": "tool"
    },
    {
      "href": "/guides/is-ga4-sampling-your-data",
      "label": "Is GA4 sampling your data?",
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
  "datePublished": "2026-07-22",
  "dateModified": "2026-07-22"
};

export default entry;
