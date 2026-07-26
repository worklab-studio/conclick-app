import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "glossary",
  "slug": "what-is-llms-txt",
  "h1": "What Is llms.txt, Really? A Straight Answer",
  "metaTitle": "What Is llms.txt? The Honest 2026 Definition",
  "metaDescription": "llms.txt is a proposed Markdown file that hands AI models a clean map of your site. Here is what it is, who actually reads it, and whether it helps SEO.",
  "primaryKeyword": "what is llms.txt",
  "tldr": "llms.txt is a proposed convention: a Markdown file at yoursite.com/llms.txt that lists your key pages so a language model can read a clean version of your site instead of crawling everything. Jeremy Howard proposed it in September 2024. It is real and documented, but as of 2026 no major AI crawler has committed to reading it, and Google says its Search systems do not.",
  "intro": "I keep getting asked whether we should ship one of these files for Conclick, so I read the actual proposal instead of the marketing around it. Here is the honest version. The idea is a small Markdown file, sitting at the root of your site, that hands a language model a curated map of your best pages. The concept is sound. The adoption is not settled, and anyone selling it to you as a ranking trick is running ahead of the evidence.",
  "sections": [
    {
      "type": "h2",
      "text": "What it actually is",
      "id": "what-it-actually-is"
    },
    {
      "type": "p",
      "text": "Think of it as a table of contents written for machines instead of people. A normal web page is wrapped in navigation, consent prompts, ads and markup that a model has to wade through. This file strips that away. You write a short Markdown document that names your project, describes it in a sentence, and links to the pages you most want a model to read, each with a one-line note on what it covers."
    },
    {
      "type": "p",
      "text": "It is a proposal, not a law and not a search engine feature. Jeremy Howard of Answer.AI published the idea in September 2024, and the spec lives at llmstxt.org. The problem it tries to solve is genuine: model context windows are too small to swallow an entire site, so the document offers a clean, pre-digested shortlist a model can pull in at the moment it answers a question."
    },
    {
      "type": "h2",
      "text": "What actually goes in it",
      "id": "whats-in-the-file"
    },
    {
      "type": "p",
      "text": "The format is deliberately plain. The spec asks for a specific order, and only the first line is strictly required."
    },
    {
      "type": "ul",
      "items": [
        "An H1 with the name of your site or project. This is the only mandatory part.",
        "A blockquote with a short summary of what the site is and who it is for.",
        "Optional paragraphs giving extra context a model should know before it reads on.",
        "One or more H2 sections, each a list of Markdown links to important pages, with a short description after each link.",
        "An optional section literally headed Optional, holding secondary links a model can skip when it is short on room."
      ]
    },
    {
      "type": "p",
      "text": "Many sites pair it with a second document called llms-full.txt, which concatenates the full text of the linked pages into one long file. The short one is the index. The long one is the whole library flattened into Markdown. Tooling like Mintlify generates both automatically for the docs sites it hosts, which is a large part of why the format spread at all."
    },
    {
      "type": "h2",
      "text": "Who reads it, and who does not",
      "id": "who-reads-it"
    },
    {
      "type": "p",
      "text": "This is where the honest answer diverges from the hype, so I want to be precise. There is a difference between a file existing and a machine choosing to fetch it."
    },
    {
      "type": "p",
      "text": "As of 2026, no major AI provider has publicly committed to reading third-party llms.txt files when its crawler visits your site. Google has been the most direct about this. Its Search Advocate John Mueller compared the format to the old keywords meta tag: the tag search engines eventually abandoned because it was just a site owner claiming what a site was about, with nothing verifying it."
    },
    {
      "type": "quote",
      "text": "AFAIK none of the AI services have said they're using LLMs.TXT (and you can tell when you look at your server logs that they don't even check for it).",
      "cite": "John Mueller, Google Search Advocate, April 2025"
    },
    {
      "type": "p",
      "text": "Google has separately said its Search systems, including its AI features, do not use the file to rank or surface pages. So if your reason for adding one is to climb Google or to show up in AI overviews, the public evidence does not support that today. The place it genuinely helps is narrower: when a person or a tool hands the URL directly to a model. Paste the file into a chat, point a coding assistant at it, or feed it to an answer engine that accepts a source link, and the model gets a clean map instead of a scraped mess."
    },
    {
      "type": "h2",
      "text": "Who publishes one anyway",
      "id": "who-publishes-one"
    },
    {
      "type": "p",
      "text": "Plenty of serious companies ship one, which muddies the picture, so it is worth separating two things. Hosting the file on your own documentation is useful even if no crawler auto-reads it, because your users and their coding assistants can point at it on purpose."
    },
    {
      "type": "p",
      "text": "Anthropic's developer docs publish one, and I checked before writing this: their docs expose both the short index and a full version at the documentation root. Mintlify rolled out automatic generation across the docs sites it hosts in late 2024, which is how thousands of documentation sites, from AI labs to developer tools, ended up carrying the file almost overnight. Third-party trackers now count hundreds of thousands of sites with one. Adoption of publishing it is real. Adoption of reading it is the part still missing."
    },
    {
      "type": "callout",
      "text": "Two different questions get blurred together constantly: does my site have an llms.txt file, and does anything actually read it. The first is easy and increasingly common. The second, for general web crawling, is still mostly no."
    },
    {
      "type": "h2",
      "text": "Should you add one to your site",
      "id": "should-you-add-one"
    },
    {
      "type": "p",
      "text": "Here is how I would decide, as someone who has to make this call for my own product. If you run documentation or an API that developers feed into coding assistants, add one. The payoff is concrete: people deliberately point tools at your docs, and a clean Markdown map genuinely helps them. Many doc platforms generate it for free, so the cost is close to zero."
    },
    {
      "type": "p",
      "text": "If you run a small marketing site or a blog with a few hundred visitors a month and your goal is more search traffic, I would not lose sleep over it. It will not hurt you, and it costs little to add, but treating it as a search lever is chasing a signal nobody has confirmed exists. Ship your content, keep it readable, and revisit this the moment a provider you care about actually announces support."
    },
    {
      "type": "p",
      "text": "The one thing I would not do is pay an agency to build and maintain one on the promise that it lifts your rankings. That is selling a certainty the evidence does not currently back."
    },
    {
      "type": "h2",
      "text": "How I think about it for measurement",
      "id": "measuring-ai-referrals"
    },
    {
      "type": "p",
      "text": "My actual interest here sits downstream. Whether or not you add the file, the real question for a founder is whether AI answer engines are sending you anyone, and most analytics setups are bad at showing it. Traffic from an AI tool often arrives with no referrer, or a referrer that gets lumped into direct, so it hides in plain sight."
    },
    {
      "type": "p",
      "text": "I build Conclick, so treat this as disclosure, but the honest job here is measurement, not a manifest file. Before you optimise for machines, get to the point where you can see which sources, including AI ones, actually bring people who then do something on your site. Otherwise you are tuning for a channel you cannot even confirm is running."
    }
  ],
  "faq": [
    {
      "question": "Does Google use llms.txt?",
      "answer": "No. Google's John Mueller said in 2025 that its Search systems do not use the file, and that server logs show AI crawlers do not even request it. He compared it to the old keywords meta tag, which search engines abandoned. Adding the file will not lift or hurt your Google rankings."
    },
    {
      "question": "Do OpenAI, Anthropic or other AI models read my llms.txt?",
      "answer": "As of 2026 no major AI provider has committed to automatically reading third-party llms.txt files during crawling. The file is useful when a person or a tool feeds its URL directly to a model, for example inside a coding assistant, but general web crawlers are not documented to fetch it on their own."
    },
    {
      "question": "What is the difference between llms.txt and robots.txt?",
      "answer": "They solve opposite problems. robots.txt tells crawlers which URLs they may or may not access. llms.txt grants or denies nothing: it points a model at the content you want it to read and gives a clean Markdown version of it. One is permissions, the other is a curated map."
    },
    {
      "question": "What is llms-full.txt?",
      "answer": "It is a companion document. Where the short file is an index of links, llms-full.txt concatenates the full text of those pages into one long Markdown file, so a model can ingest everything in a single fetch. Documentation tools like Mintlify often generate both side by side."
    },
    {
      "question": "Will an llms.txt file help my SEO?",
      "answer": "There is no evidence it does, and Google has said its Search systems ignore it. Treat it as documentation plumbing for tools that consume it directly, not as a ranking tactic. If someone promises it will raise your search or AI-overview visibility, they are ahead of the public evidence."
    },
    {
      "question": "Should a small site bother creating one?",
      "answer": "If you publish developer docs, yes, since users point assistants at them and many platforms generate it for free. For a small blog or marketing site chasing search traffic, it is optional and low priority. It will not hurt, but do not expect a ranking boost from it."
    }
  ],
  "heroWord": "manifest",
  "category": "GEO",
  "topics": [
    "geo",
    "llms.txt",
    "ai search",
    "seo"
  ],
  "sources": [
    {
      "label": "llms.txt proposal and specification (llmstxt.org)",
      "url": "https://llmstxt.org/"
    },
    {
      "label": "Search Engine Journal: Google's John Mueller compares llms.txt to the keywords meta tag (April 17, 2025)",
      "url": "https://www.searchenginejournal.com/google-says-llms-txt-comparable-to-keywords-meta-tag/544804/"
    },
    {
      "label": "Search Engine Journal: Google says llms.txt has no current implementation",
      "url": "https://www.searchenginejournal.com/google-says-llms-txt-is-purely-speculative-for-now/577576/"
    },
    {
      "label": "Mintlify: Simplifying docs for AI with /llms.txt",
      "url": "https://www.mintlify.com/blogs/simplifying-docs-with-llms-txt"
    },
    {
      "label": "Anthropic developer documentation llms.txt",
      "url": "https://platform.claude.com/docs/llms.txt"
    }
  ],
  "internalLinks": [
    {
      "href": "/blogs/vanity-metrics-are-lying",
      "label": "Why vanity metrics mislead you",
      "group": "blog"
    },
    {
      "href": "/glossary/marketing-attribution",
      "label": "What marketing attribution means",
      "group": "glossary"
    },
    {
      "href": "/glossary/cookieless-analytics",
      "label": "What cookieless analytics means",
      "group": "glossary"
    },
    {
      "href": "/for/indie-hackers",
      "label": "Analytics built for indie hackers",
      "group": "useCase"
    }
  ],
  "relatedTools": [],
  "leadMagnet": {
    "kind": "addWebsite",
    "headline": "Measure this automatically",
    "sub": "Conclick tracks this out of the box, alongside heatmaps, funnels, and revenue attribution. Free for 14 days, no card.",
    "ctaLabel": "Add My Website"
  },
  "datePublished": "2026-07-22",
  "dateModified": "2026-07-22"
};

export default entry;
