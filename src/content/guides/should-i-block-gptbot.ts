import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "should-i-block-gptbot",
  "h1": "Should I Block GPTBot? The Real Decision Behind the Robots.txt Line",
  "metaTitle": "Should I Block GPTBot? Training vs Retrieval Crawlers",
  "metaDescription": "Blocking GPTBot only opts you out of OpenAI model training. It does not remove you from ChatGPT search, which uses a separate crawler. Here is the real call.",
  "tldr": "For most sites, no. Blocking GPTBot only tells OpenAI not to train on your pages. It does not remove you from ChatGPT search, which runs on a separate crawler, OAI-SearchBot. The real split is training crawlers, which give nothing back, versus retrieval crawlers, which send citations and clicks. Block training if you want. Keep retrieval open.",
  "intro": "I block GPTBot on my own sites, and I still show up in ChatGPT. That surprises people, so let me explain the mechanism instead of the marketing. The question hides two very different decisions inside one robots.txt line, and once you separate them the answer gets easy. Most of the panic about AI crawlers comes from treating them as one thing. They are not.",
  "sections": [
    {
      "type": "h2",
      "text": "The short answer",
      "id": "the-short-answer"
    },
    {
      "type": "p",
      "text": "For most independent sites, blocking GPTBot is a small and reversible decision. It stops OpenAI from using your pages to train future models. It does not, and this is the part people get wrong, take you out of ChatGPT's search answers. Those run on a different crawler with a different name, and they are the ones that can actually send you a visitor."
    },
    {
      "type": "p",
      "text": "So the honest answer to whether you should block it is: sure, if you object to model training, go ahead. Just do it on purpose, and do not assume it protects you from anything else or that it will change your traffic. It will not do either."
    },
    {
      "type": "h2",
      "text": "Two jobs, two kinds of crawler",
      "id": "two-kinds-of-crawler"
    },
    {
      "type": "p",
      "text": "Every major AI company now runs more than one bot, and they do genuinely different jobs. Lumping them together is where the bad advice starts. There are training crawlers, which read your site to help build the model itself, and there are retrieval crawlers, which read your site so an assistant can quote you live and link back. The first kind gives you nothing you can measure. The second kind can send a human to your door."
    },
    {
      "type": "ul",
      "items": [
        "GPTBot is OpenAI's training crawler. Disallowing it in robots.txt tells OpenAI your content should not be used to train its foundation models. It sends no traffic and produces no citation.",
        "CCBot is Common Crawl's crawler. Its open dataset has been used to train GPT, Llama, Mistral and many other models, so it is training infrastructure under another name. Nothing comes back to you directly.",
        "Google-Extended is not even a separate crawler. It is a control token in robots.txt. Disallowing it opts your content out of training Gemini and Vertex AI, and Google's own documentation says it does not affect your Search ranking.",
        "ClaudeBot is Anthropic's training crawler. Same category as GPTBot: block it to stay out of training, and expect no traffic in return.",
        "OAI-SearchBot is the crawler behind ChatGPT search. This is the one that decides whether ChatGPT can surface your page with a link. Retrieval, not training.",
        "PerplexityBot indexes pages for Perplexity's answers and citations. Perplexity's own documentation says it does not build foundation models, so this is about being quoted, not about being trained on.",
        "ChatGPT-User and Claude-User are live fetches. When a person asks and the assistant opens a page to answer, that is these agents at work. OpenAI notes that because a user starts each request, robots.txt rules may not even apply."
      ]
    },
    {
      "type": "h2",
      "text": "Blocking GPTBot does not block ChatGPT search",
      "id": "gptbot-is-not-chatgpt-search"
    },
    {
      "type": "p",
      "text": "This is the mistake that quietly costs people the most. They read that GPTBot is the OpenAI bot, add one Disallow line, and assume they have opted out of ChatGPT entirely. They have not. They have opted out of training and left search completely untouched, because search runs on OAI-SearchBot."
    },
    {
      "type": "quote",
      "text": "A webmaster can allow OAI-SearchBot in order to appear in search results while disallowing GPTBot to indicate that crawled content should not be used for training OpenAI's generative AI foundation models.",
      "cite": "OpenAI, Overview of OpenAI Crawlers"
    },
    {
      "type": "p",
      "text": "That is straight from OpenAI's own bot documentation. The two are independent by design. If you want to be cited in ChatGPT search while staying out of the training set, you allow OAI-SearchBot and disallow GPTBot. The far more damaging error runs the other way: catching OAI-SearchBot in a broad blanket rule and vanishing from ChatGPT answers while you thought you were only touching training."
    },
    {
      "type": "h2",
      "text": "What blocking actually buys you",
      "id": "what-blocking-buys-you"
    },
    {
      "type": "p",
      "text": "Strip away the noise and both the cost and the benefit are small, which is why I get annoyed at how much anxiety this topic generates."
    },
    {
      "type": "p",
      "text": "Blocking a training crawler buys you one thing: your content is less likely to end up in the next model's training data. That is a real preference and a legitimate one, especially if you publish original research or paid work. What it does not buy you is any measurable outcome. You cannot open your analytics and attribute a signup to being in a training set. There is no referral, no click, no line item."
    },
    {
      "type": "p",
      "text": "Keeping a retrieval crawler open buys you the opposite: a shot at being the source an assistant quotes, with a link a real person can follow. That click lands in your analytics like any other referral. It is the only part of this whole conversation you can actually measure."
    },
    {
      "type": "callout",
      "text": "There is an honest debate about whether being in the training data helps a model recall your brand and mention it unprompted. Maybe it does. But it is unmeasurable, you cannot switch it on or off per visitor, and I do not build a strategy on things I cannot see. The measurable value sits entirely on the retrieval side."
    },
    {
      "type": "h2",
      "text": "How I set it up for Conclick",
      "id": "how-i-set-it-up"
    },
    {
      "type": "p",
      "text": "I run Conclick, so here is exactly what I do rather than a generic recommendation. My robots.txt allows the retrieval crawlers: OAI-SearchBot, PerplexityBot, Claude-SearchBot, and the user-triggered fetchers. It disallows the training crawlers: GPTBot, CCBot, ClaudeBot, and Google-Extended. Retrieval open, training closed."
    },
    {
      "type": "p",
      "text": "That is a values call, not a growth hack. I would rather my writing help answer a real question and send me the reader than sit silently inside a training corpus I get nothing back from. If your view on training is different, flip those lines without guilt. The retrieval lines are the ones I would never touch, because those are the ones that show up in the numbers."
    },
    {
      "type": "h2",
      "text": "Measure what retrieval actually sends",
      "id": "measure-the-referrals"
    },
    {
      "type": "p",
      "text": "The reason to keep retrieval open is that it produces traffic you can see. When ChatGPT, Perplexity or Claude cites you, some readers click the link, and that arrives as referral traffic in your analytics. If you are not watching for it, you will underrate the entire channel and maybe block the wrong bot to protect yourself from a threat that was never there."
    },
    {
      "type": "p",
      "text": "Treat AI assistants as a referral source like any other. Watch which pages get cited, how those visitors behave once they land, and whether they do anything worth money. That is ordinary attribution work applied to a new channel, and it is the only way to know whether allowing these crawlers is paying off for you specifically."
    },
    {
      "type": "p",
      "text": "For a bootstrapped founder with a few hundred visitors a month, this is not a big project. You already have the data. You just need to name AI referrals as a source and follow those sessions through to whatever counts as a conversion for you. Do that for a quarter and you will have a real answer instead of a vibe."
    }
  ],
  "faq": [
    {
      "question": "Will blocking GPTBot remove me from ChatGPT?",
      "answer": "No. GPTBot is OpenAI's training crawler. ChatGPT's search answers are built by a separate crawler called OAI-SearchBot, and its live browsing uses ChatGPT-User. Blocking GPTBot only signals that your content should not be used to train OpenAI's models. To stay visible in ChatGPT search, keep OAI-SearchBot allowed."
    },
    {
      "question": "What is the difference between a training crawler and a retrieval crawler?",
      "answer": "A training crawler, like GPTBot, CCBot or ClaudeBot, reads your site to help build the model itself and sends you nothing back. A retrieval crawler, like OAI-SearchBot or PerplexityBot, reads your site so an assistant can quote it live and link to you. Retrieval is the only side that can produce a measurable click."
    },
    {
      "question": "Does blocking GPTBot help or hurt my SEO?",
      "answer": "It does neither directly. GPTBot is unrelated to Googlebot and to your Google Search ranking. Where people hurt themselves is with a clumsy robots.txt rule that also catches retrieval crawlers, which can quietly drop them out of AI search answers. Block precisely, and only the bot you actually mean."
    },
    {
      "question": "Should I block CCBot and Google-Extended too?",
      "answer": "If your goal is staying out of model training, yes, those belong in the same bucket as GPTBot. CCBot feeds Common Crawl, a dataset used to train many models, and Google-Extended opts you out of training Gemini and Vertex AI. Google says disallowing Google-Extended does not affect your Search ranking, so it is a low-risk block when training is your concern."
    },
    {
      "question": "Is there any measurable downside to blocking training crawlers?",
      "answer": "Not one you can point to in analytics. Training crawlers do not send referral traffic or citations, so blocking them removes no measurable channel. The only real downside is philosophical: some argue presence in training data helps a model recall your brand, but that effect is unmeasurable and cannot be attributed. The measurable traffic all comes from retrieval crawlers, which you can keep open."
    }
  ],
  "heroWord": "crawlers",
  "category": "GEO",
  "topics": [
    "gptbot",
    "ai crawlers",
    "geo",
    "robots.txt"
  ],
  "sources": [
    {
      "label": "OpenAI, Overview of OpenAI Crawlers",
      "url": "https://developers.openai.com/api/docs/bots"
    },
    {
      "label": "Google Search Central, Google's common crawlers (Google-Extended)",
      "url": "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers"
    },
    {
      "label": "Perplexity, Perplexity Crawlers",
      "url": "https://docs.perplexity.ai/docs/resources/perplexity-crawlers"
    },
    {
      "label": "Search Engine Journal, Anthropic's Claude bots make robots.txt decisions more granular",
      "url": "https://www.searchenginejournal.com/anthropics-claude-bots-make-robots-txt-decisions-more-granular/568253/"
    },
    {
      "label": "Common Crawl, CCBot",
      "url": "https://commoncrawl.org/ccbot"
    }
  ],
  "internalLinks": [
    {
      "href": "/glossary/marketing-attribution",
      "label": "How marketing attribution actually works",
      "group": "glossary"
    },
    {
      "href": "/glossary/sessions-vs-visitors",
      "label": "Sessions vs visitors, explained",
      "group": "glossary"
    },
    {
      "href": "/blog/why-revenue-attribution-matters",
      "label": "Why revenue attribution matters",
      "group": "blog"
    },
    {
      "href": "/for/indie-hackers",
      "label": "Analytics for indie hackers",
      "group": "for"
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
