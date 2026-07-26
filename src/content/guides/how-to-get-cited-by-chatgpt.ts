import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "how-to-get-cited-by-chatgpt",
  "h1": "How to Get Cited by ChatGPT: What Actually Moves the Needle",
  "metaTitle": "How to Get Cited by ChatGPT: A Founder's Playbook",
  "metaDescription": "Get cited by ChatGPT: rank in Bing's index, let OAI-SearchBot crawl you, and answer the question up top. First-hand field notes from a founder.",
  "primaryKeyword": "how to get cited by chatgpt",
  "tldr": "To get cited by ChatGPT, get your pages into Bing's index (ChatGPT search leans heavily on Bing), let OpenAI's OAI-SearchBot crawl you, and answer the question in the first two sentences of every page. llms.txt is cheap to ship and Anthropic and Perplexity read it, but Google ignores it and it shows no proven citation lift yet. Then watch your referrers for chatgpt.com.",
  "intro": "I shipped an llms.txt file, an IndexNow feed, and an explicit AI-crawler policy on Conclick's own site, then watched the analytics to see what actually happened. Some of it worked, some of it was folklore, and the reasons were not the ones most posts repeat. So this is the first-hand version rather than the theory: what I did, what showed up in our referrer data, and what I would skip if I were starting over with 500 visitors a month and no time to burn. I build analytics for a living, so measuring the result was the one part I could not fake.",
  "sections": [
    {
      "type": "h2",
      "text": "How ChatGPT actually finds the sources it cites",
      "id": "how-chatgpt-finds-sources"
    },
    {
      "type": "p",
      "text": "Before you optimise anything, learn the plumbing. When ChatGPT answers a question that needs fresh information, it runs a web search and pulls back a handful of pages to quote. That retrieval leans primarily on Bing's search index, supplemented by OpenAI's own crawler. One independent analysis of hundreds of ChatGPT search citations found the large majority matched Bing's top organic results for the same query. So the uncomfortable truth is that a big part of getting quoted by the newest AI product is doing well in Microsoft's decade-old search engine."
    },
    {
      "type": "p",
      "text": "That single fact reorders the whole to-do list. It means the work is less about a magic file and more about classic discoverability: can the crawler reach your page, is it in the index the model retrieves from, and once retrieved, is your answer the cleanest one to lift. Everything below follows from that, in that order."
    },
    {
      "type": "callout",
      "text": "Step zero is not llms.txt. Step zero is being in Bing's index. If you are not there, no amount of AI-friendly formatting will get you quoted, because the retriever never sees the page in the first place."
    },
    {
      "type": "h2",
      "text": "Get into Bing's index first",
      "id": "get-into-bing"
    },
    {
      "type": "p",
      "text": "This is the least glamorous step and the one most people skip. Claim your site in Bing Webmaster Tools, submit your sitemap, and confirm your key pages are actually indexed, not just submitted. It takes about fifteen minutes and it is the prerequisite for everything else. I did this for Conclick before I touched anything AI-specific, and it is the change I would make first for a site with a few hundred visitors a month."
    },
    {
      "type": "p",
      "text": "Then speed up how fast Bing learns about your changes. IndexNow is an open protocol from Microsoft and Yandex that lets your site ping the search engine the moment a page is created, updated, or deleted, instead of waiting to be recrawled on its own schedule. We ship an IndexNow feed on Conclick's site. Because ChatGPT retrieves from Bing's index, getting new and edited pages into Bing faster is an indirect but real lever on how soon they can be quoted."
    },
    {
      "type": "ul",
      "items": [
        "Verify your domain in Bing Webmaster Tools and submit your XML sitemap.",
        "Read the index coverage report and fix anything Bing is refusing to index.",
        "Wire up IndexNow (many CMS platforms and CDNs, including Cloudflare, offer a one-click option) so edits get pinged instantly.",
        "Import your Google Search Console data into Bing to skip re-verification and move faster."
      ]
    },
    {
      "type": "h2",
      "text": "Answer the question first, then earn the quote",
      "id": "answer-first"
    },
    {
      "type": "p",
      "text": "Once you can be retrieved, the game is being the most quotable version of the answer. Language models lift the passage that most cleanly resolves the query, and they tend to lift it from the top of the page. So lead every page with a direct, self-contained answer in the first two sentences, before any preamble. If a reader, or a model, can copy your opening lines and walk away with a complete answer, you have written something worth quoting."
    },
    {
      "type": "p",
      "text": "After the direct answer, earn trust the way a fact-checker would. Use specific numbers with their sources, name real tools and versions instead of vague categories, and structure the page as clear questions with clear answers. Add an FAQ block. Keep it current, because stale pages get quietly demoted as the accepted answer moves on. None of this is exotic. It is the same structure a busy human skims, which is not a coincidence: the model is optimising for the same thing you are."
    },
    {
      "type": "ul",
      "items": [
        "Open with a 40 to 60 word answer that stands on its own, with no throat-clearing.",
        "Back claims with concrete figures and link the primary source, not a blog that reworded it.",
        "Write in question-and-answer blocks so a single section can be lifted whole.",
        "Name specifics: tools, versions, dates, numbers. Vague pages do not get quoted.",
        "Refresh the page when the facts change, and show a visible modified date."
      ]
    },
    {
      "type": "quote",
      "text": "You are not writing to rank a keyword any more. You are writing the sentence you want the machine to read out loud with your name attached to it.",
      "cite": "a note I left myself while rewriting our docs"
    },
    {
      "type": "h2",
      "text": "The honest truth about llms.txt",
      "id": "llms-txt-truth"
    },
    {
      "type": "p",
      "text": "Here is where I have to be blunt, because I shipped one. An llms.txt is a plain-text file that lists your most important pages in a clean, model-readable form. Anthropic hosts one on its developer docs, and Perplexity has said it retrieves llms.txt to help decide which pages to prioritise. So it is not useless. But Google has been explicit, through Gary Illyes at its 2025 Search Central event, that Google Search does not use llms.txt, and that its AI Overviews and AI Mode pull from the same index as normal search. In plain terms: standard SEO is what feeds Google's AI answers, not a special file."
    },
    {
      "type": "p",
      "text": "For ChatGPT specifically, there is no published evidence that an llms.txt file lifts your citation rate today. So my honest recommendation is this: ship it, because it takes ten minutes and the tools that do read it cost you nothing, but do not treat it as the thing that gets you quoted. It is a nice-to-have sitting on top of the real work, which is indexation and answer-first content. I keep ours updated and I expect nothing dramatic from it, and so far that expectation has been correct."
    },
    {
      "type": "h2",
      "text": "Let the right crawlers in, block the wrong ones",
      "id": "crawler-policy"
    },
    {
      "type": "p",
      "text": "A lot of sites accidentally opt themselves out of citations by blocking every bot they can name. OpenAI actually runs three separate crawlers, and they do different jobs. GPTBot collects content to train models. OAI-SearchBot is the one that surfaces and cites you inside ChatGPT search. ChatGPT-User fetches a page live when a person clicks a link or asks about it. Per OpenAI's own documentation, if you block OAI-SearchBot you will not appear directly in ChatGPT's search answers, though you may still show up as a plain navigation link."
    },
    {
      "type": "p",
      "text": "So the policy that actually matches most founders' goals is nuanced, not all-or-nothing. If you want the referral traffic and the citations but you do not want to feed model training, allow OAI-SearchBot and ChatGPT-User while disallowing GPTBot in robots.txt. That is the explicit AI-crawler policy we run on Conclick, and it is a deliberate choice rather than a default. Whatever you land on, land on it on purpose, because a copy-pasted blanket block is how sites quietly disappear from AI answers they wanted to be in."
    },
    {
      "type": "ul",
      "items": [
        "GPTBot: the training crawler. Disallow it in robots.txt to opt out of model training.",
        "OAI-SearchBot: the citation crawler. Allow it, or you vanish from ChatGPT search answers.",
        "ChatGPT-User: live, user-triggered fetches. Allow it so people can pull your page into a chat.",
        "Open your robots.txt today. A blanket AI block may be costing you the exact citations you were chasing."
      ]
    },
    {
      "type": "h2",
      "text": "How you even measure any of this",
      "id": "measuring"
    },
    {
      "type": "p",
      "text": "Everything above is guesswork until you measure it, and this is the part almost nobody sets up. When the model sends someone to your site from a cited link, your analytics records the referrer, usually as chatgpt.com. We see those referrers in real customer data, and watching them climb is the only honest signal that the work is paying off. It is a small number for most sites right now, but it is real traffic from a real quote, and it tells you which specific pages are getting picked so you can make more like them."
    },
    {
      "type": "p",
      "text": "Two caveats keep you honest. First, referrer data undercounts, because some clients strip the referrer and plenty of answers cite you with no click at all, so treat the number as a floor rather than the whole truth. Second, do not confuse being mentioned with being visited. Conclick, which is built on the open-source Umami engine, shows these referrers without setting tracking cookies, though whether any given setup needs a consent banner depends on your jurisdiction and configuration and may qualify for exemption in some cases, so treat that as a question for your own counsel. This is not legal advice."
    },
    {
      "type": "p",
      "text": "If you want to go further, tag the outbound links inside your own content with UTM parameters so you can separate an AI referral from a normal one, and fold these visits into the same attribution view you use for every other channel. The point is to treat AI as one more source that either produces revenue or does not, and to resist the pull of impression counts that feel good and change nothing about the bank balance."
    }
  ],
  "faq": [
    {
      "question": "Does ChatGPT use Google or Bing to find sources?",
      "answer": "ChatGPT search retrieves primarily from Bing's index, supplemented by OpenAI's own OAI-SearchBot crawler. One independent analysis of hundreds of ChatGPT citations found the large majority matched Bing's top organic results for the same query. Practically, that means your Bing visibility is the first thing to fix if you want to be quoted, well before any AI-specific tactic."
    },
    {
      "question": "Do I need an llms.txt file to get cited by ChatGPT?",
      "answer": "No. Anthropic and Perplexity do read llms.txt, but there is no published evidence it lifts your ChatGPT citation rate, and Google has said its Search systems ignore it entirely. It costs ten minutes to ship, so I keep one, but I treat it as optional polish. The work that actually earns citations is being in Bing's index and writing answer-first pages."
    },
    {
      "question": "What is OAI-SearchBot and should I allow it?",
      "answer": "OAI-SearchBot is OpenAI's crawler that surfaces and cites pages inside ChatGPT search. Per OpenAI's documentation, if you block it you will not appear directly in ChatGPT's search answers. It is separate from GPTBot, which is the training crawler. If you want citations but not model training, the honest move is to allow OAI-SearchBot and disallow GPTBot in your robots.txt."
    },
    {
      "question": "How do I know if ChatGPT is actually citing me?",
      "answer": "Watch your referrer report for chatgpt.com. When someone clicks a cited link, your analytics logs it as a referral, and that is the cleanest first-hand signal you have. It undercounts, because some clients strip the referrer and many answers quote you with no click, so read it as a floor. Even a small, rising number tells you which pages are getting picked."
    },
    {
      "question": "How long does it take to get cited by ChatGPT?",
      "answer": "There is no guaranteed timeline. It depends on how fast Bing indexes your pages, which IndexNow can shorten from weeks to hours, and on whether your content is genuinely the cleanest answer to the query. New sites with thin content wait longer. I would set up the indexation and structure, publish consistently, and measure referrers monthly rather than expecting an overnight result."
    }
  ],
  "heroWord": "cited",
  "category": "GEO",
  "topics": [
    "geo",
    "ai search",
    "chatgpt",
    "seo",
    "content"
  ],
  "sources": [
    {
      "label": "Search Engine Land: Google says normal SEO works for AI Overviews and llms.txt won't be used",
      "url": "https://searchengineland.com/google-says-normal-seo-works-for-ranking-in-ai-overviews-and-llms-txt-wont-be-used-459422"
    },
    {
      "label": "OpenAI: overview of GPTBot, OAI-SearchBot and ChatGPT-User crawlers",
      "url": "https://developers.openai.com/api/docs/bots"
    },
    {
      "label": "Bing: IndexNow, instantly index your content in search engines",
      "url": "https://blogs.bing.com/webmaster/october-2021/IndexNow-Instantly-Index-your-web-content-in-Search-Engines"
    },
    {
      "label": "Ahrefs: what is llms.txt, and Anthropic and Perplexity support for it",
      "url": "https://ahrefs.com/blogs/what-is-llms-txt/"
    },
    {
      "label": "Conbersa: analysis finding the large majority of ChatGPT citations match Bing organic results",
      "url": "https://www.conbersa.ai/learn/bing-indexing-optimization-for-chatgpt"
    }
  ],
  "internalLinks": [
    {
      "href": "/glossary/marketing-attribution",
      "label": "Marketing attribution, explained",
      "group": "glossary"
    },
    {
      "href": "/glossary/utm",
      "label": "UTM parameters, explained",
      "group": "glossary"
    },
    {
      "href": "/blogs/vanity-metrics-are-lying",
      "label": "Why vanity metrics lie to you",
      "group": "blog"
    },
    {
      "href": "/for/indie-hackers",
      "label": "Analytics for indie hackers",
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
  "datePublished": "2026-07-22",
  "dateModified": "2026-07-22"
};

export default entry;
