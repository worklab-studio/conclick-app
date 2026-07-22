import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "why-is-my-page-not-indexed",
  "h1": "Why Your Page Is Not Indexed in Google Search Console",
  "metaTitle": "Why Is My Page Not Indexed in Google Search Console?",
  "metaDescription": "Discovered and Crawled currently not indexed mean different things in Search Console. What each status says about your page, and what actually fixes it.",
  "tldr": "The status string tells you which problem you have. 'Discovered - currently not indexed' means Google found the URL but has not fetched it yet, usually a crawl-priority signal. 'Crawled - currently not indexed' means Google read the page and decided it was not worth keeping, usually a quality or duplication verdict. A young domain with few links often just has to wait.",
  "intro": "I have watched this exact panic play out on my own projects. You publish a page, you submit it, you refresh Search Console for a week, and the report keeps saying the same thing. The good news is that the status string is not vague. Google is telling you which of two very different problems you have, and the fix depends entirely on which one it is. So before you change anything, read the exact words.",
  "sections": [
    {
      "type": "h2",
      "text": "Read the exact status string first",
      "id": "read-the-status-string"
    },
    {
      "type": "p",
      "text": "Search Console does not lump every missing URL into one bucket. Under Indexing, then Pages, then the reasons listed below the chart, it hands you a precise label. The two you will see most often for a URL that refuses to show up are 'Discovered - currently not indexed' and 'Crawled - currently not indexed'. They look almost identical. They are not. One means Google has not even fetched your content yet. The other means it fetched it, looked at it, and passed."
    },
    {
      "type": "p",
      "text": "I treat that one-word difference, discovered versus crawled, as the whole diagnosis. Everything downstream depends on it, so I never start rewriting meta tags or copy until I know which of the two labels I am actually looking at."
    },
    {
      "type": "h2",
      "text": "Discovered, currently not indexed: a priority signal",
      "id": "discovered-not-indexed"
    },
    {
      "type": "quote",
      "text": "The page was found by Google, but not crawled yet.",
      "cite": "Google Search Console Help, Page Indexing report"
    },
    {
      "type": "p",
      "text": "That is Google's own wording. It found the URL, probably through your sitemap or an internal link, then chose not to fetch it right away. The help doc says the crawl was usually rescheduled because fetching it was expected to overload the site. On a 500-visitor hobby project that server-load reason rarely holds literally. What it really signals is priority: Google has your address, and it has decided your address is not worth the trip yet."
    },
    {
      "type": "p",
      "text": "This is a demand problem, not a rejection. The engine has not judged your writing because it has not read your writing. The lever here is convincing it the URL is worth fetching. That means stronger internal links pointing at it, a clean sitemap that does not bury it among thousands of low-value paths, and enough overall site signal that the crawler wants to come back. New and sparse projects sit in this state constantly, and often the honest answer is that you wait while the rest of the domain earns some trust."
    },
    {
      "type": "h2",
      "text": "Crawled, currently not indexed: a quality verdict",
      "id": "crawled-not-indexed"
    },
    {
      "type": "p",
      "text": "This label is the harder pill. Google fetched the URL, read it, and decided not to keep it. The help text is blunt: it may or may not be listed in future, and there is no point resubmitting. There is no server-load excuse here. The engine spent the resource, evaluated the content, and the answer was no."
    },
    {
      "type": "p",
      "text": "In my experience this is almost always a quality or duplication verdict. The page might be thin, it might say what forty other results already say better, it might be a near-duplicate of another URL on your own domain, or it might read as templated filler. Google's own people have said the quiet part out loud on this. John Mueller and Martin Splitt have described mass crawled-not-indexed patterns as a signal that the system doubts a whole site's quality, and they named undifferentiated, machine-generated content as a live example of what sets it off."
    },
    {
      "type": "callout",
      "text": "If a large share of your URLs sit in crawled-not-indexed at once, stop treating it as a per-page bug. That pattern is Google telling you it is not sure the whole site is worth the space. Improving your ten best pages usually moves the needle more than resubmitting the fifty weak ones."
    },
    {
      "type": "p",
      "text": "The fix is editorial, not technical. Make the page genuinely better than the alternatives already ranking, or merge it into a stronger page and redirect. Resubmitting the same thin writing and hitting Request Indexing again just asks the same question and earns the same answer."
    },
    {
      "type": "h2",
      "text": "Crawl budget is almost certainly not your problem",
      "id": "crawl-budget-myth"
    },
    {
      "type": "p",
      "text": "Every forum thread about this eventually blames crawl budget. For nearly every reader of this page, that is the wrong suspect. Google's own large-site documentation says crawl budget only becomes a real constraint for sites with roughly a million or more unique URLs that change weekly, or medium sites above ten thousand URLs that change every day. Gary Illyes has confirmed that million-page figure has not moved in years, and Google frames those numbers as rough estimates rather than hard cutoffs."
    },
    {
      "type": "p",
      "text": "If your project has two hundred pages, you do not have a budget ceiling. You have a demand or a quality issue wearing a budget costume. I have made this mistake myself, fiddling with robots rules and crawl-delay settings on a tiny site, when the actual problem was that my writing was not worth listing. Do not optimize a constraint you do not have."
    },
    {
      "type": "h2",
      "text": "The young-domain wait is real, even if the sandbox is a myth",
      "id": "young-domain-wait"
    },
    {
      "type": "p",
      "text": "There is a stubborn idea that Google drops every new domain into a sandbox for a few months. Google has said there is no formal sandbox filter, and I believe them. But something real is happening, and pretending otherwise does not help you. Mueller has described it as a lag: a brand-new domain has no history, no link reputation, and no engagement data, so the algorithms have to guess where it belongs and tend to guess cautiously."
    },
    {
      "type": "p",
      "text": "The practical upshot is the same whether or not you call it a sandbox. A domain registered last month, with three backlinks and no track record, gets crawled slowly and listed reluctantly. That is not a defect in your page. It is the cost of being new. The uncomfortable answer that most SEO blogs will not give you is that a chunk of this is simply time, and there is no button that skips it."
    },
    {
      "type": "h2",
      "text": "What actually moves a page into the index",
      "id": "what-moves-it"
    },
    {
      "type": "p",
      "text": "Once you know which status you have, the levers are short and unglamorous. None of them are secrets, and none of them work overnight."
    },
    {
      "type": "ul",
      "items": [
        "Internal links. A page that nothing else on your site links to looks unimportant, because by your own site's logic it is. Link to it from your home page, your relevant hub pages, and related posts. This is the cheapest fix for a discovered-but-unfetched URL.",
        "A clean sitemap. Submit an XML sitemap that lists only canonical, indexable URLs. Google treats it as a discovery and priority hint, not an order to list, so do not pad it with tag archives and thin pagination that dilute the signal.",
        "External links. A couple of genuine links from sites Google already trusts do more for a young domain than any amount of on-page tweaking. They are also the hardest to earn, which is exactly why they carry weight.",
        "Fewer, better pages. Consolidating ten thin URLs into three strong ones raises the average quality Google sees, and site-level quality is part of how it decides how much of you to list at all.",
        "Actual crawlability. Confirm the page returns a 200, is not blocked in robots.txt, carries no stray noindex tag, and canonicalizes to itself. This is rarely the root cause once ruled out, but it is worth ruling out first."
      ]
    },
    {
      "type": "h2",
      "text": "How I check whether any of this is working",
      "id": "measuring-progress"
    },
    {
      "type": "p",
      "text": "Indexation is a lagging number, so I watch two things. In Search Console I track how many pages move from not-listed into the index over weeks, not days, and I lean on the URL Inspection tool for specific pages rather than trusting the aggregate chart, which updates slowly."
    },
    {
      "type": "p",
      "text": "The second thing I watch is whether the pages that do get picked up actually earn anything. A URL in the index that brings no visitors and no signups is not a win, it is a vanity metric. I built Conclick, my own analytics tool, partly to answer that: which listed pages bring real traffic, and which of those visitors turn into revenue. It measures without cookies and is built on the open-source Umami engine, which I mention because I would rather be straight about the lineage than pretend I wrote every line from scratch. Whatever you use, tie your indexing effort back to outcomes, or you will keep celebrating pages that rank for nothing."
    }
  ],
  "faq": [
    {
      "question": "What does 'Discovered - currently not indexed' mean?",
      "answer": "It means Google found your URL, usually through a sitemap or an internal link, but has not fetched the content yet. Google's help doc says it typically rescheduled the crawl to avoid overloading the site, but on a small site the real message is priority: the engine has your address and has not decided it is worth the visit. Strengthen internal links to that URL and give the whole site time to earn trust."
    },
    {
      "question": "What does 'Crawled - currently not indexed' mean?",
      "answer": "It means Google fetched and read your page, then chose not to keep it. Google says it may or may not be listed later and there is no need to resubmit. In practice this is a quality or duplication verdict: the page is thin, near-duplicate, or reads as filler. The fix is editorial. Make it clearly better than what already ranks, or merge it into a stronger page and redirect."
    },
    {
      "question": "How long does it take Google to index a new page?",
      "answer": "There is no fixed number. An established, well-linked domain can get a new page listed within days. A domain registered last month with almost no backlinks can wait weeks or longer, because Google has no history to judge it by and crawls it slowly. Faster internal linking and a submitted sitemap help, but some of the wait is simply the cost of being new."
    },
    {
      "question": "Does submitting a URL in Search Console force Google to index it?",
      "answer": "No. Request Indexing and sitemap submission are discovery and priority hints, not commands. Google still decides whether the page earns a spot. If a page came back as crawled-not-indexed, resubmitting the same content just asks the same question and gets the same answer. Change the page first."
    },
    {
      "question": "Is my page not indexed because of crawl budget?",
      "answer": "Almost certainly not. Google's own documentation frames crawl budget as a concern for sites with roughly a million or more unique URLs, or medium sites above ten thousand pages that change daily. If your project is smaller than that, you have a demand or quality issue, not a budget ceiling. Do not spend time optimizing a constraint you do not have."
    },
    {
      "question": "Will more backlinks get my page indexed?",
      "answer": "For a young domain, genuine links from trusted sites are one of the strongest signals you can add. They tell Google the page and the domain are worth crawling and worth listing. They will not rescue a genuinely thin or duplicate page, but for a good page stuck in discovered-not-indexed on a new site, a few real external links often help more than any on-page change."
    }
  ],
  "heroWord": "unindexed",
  "category": "SEO",
  "topics": [
    "google search console",
    "indexing",
    "technical seo",
    "crawling"
  ],
  "sources": [
    {
      "label": "Google Search Console Help: Page Indexing report",
      "url": "https://support.google.com/webmasters/answer/7440203"
    },
    {
      "label": "Google: Large site owner's guide to managing crawl budget",
      "url": "https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget"
    },
    {
      "label": "Search Engine Journal: Google explains SEO connection of site quality to non-indexed pages",
      "url": "https://www.searchenginejournal.com/google-explains-seo-connection-of-site-quality-to-non-indexed-pages/582683/"
    },
    {
      "label": "Search Engine Journal: Mueller mentions Google sandbox and honeymoon ranking effects",
      "url": "https://www.searchenginejournal.com/mueller-mentions-google-sandbox-and-honeymoon-ranking-effects/408994/"
    }
  ],
  "internalLinks": [
    {
      "href": "/for/indie-hackers",
      "label": "Analytics for indie hackers on young domains",
      "group": "useCase"
    },
    {
      "href": "/blog/vanity-metrics-are-lying",
      "label": "Why an indexed page with no traffic is a vanity metric",
      "group": "blog"
    },
    {
      "href": "/blog/why-revenue-attribution-matters",
      "label": "Why revenue attribution matters",
      "group": "blog"
    },
    {
      "href": "/tools/utm-builder",
      "label": "Tag your links with a UTM builder",
      "group": "tool"
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
