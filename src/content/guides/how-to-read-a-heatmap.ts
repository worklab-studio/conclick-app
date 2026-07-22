import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "how-to-read-a-heatmap",
  "h1": "How to Read a Heatmap Without Fooling Yourself",
  "metaTitle": "How to Read a Heatmap Without Fooling Yourself",
  "metaDescription": "How to read a heatmap properly: click vs scroll vs move maps, what the fold line means, and how rage and dead clicks expose friction people never report.",
  "tldr": "To read a heatmap, treat each map as its own question: click maps show where attention turned into action, scroll maps show how far people actually get, and move maps hint at where they linger. The real signal is in the surprises, not the bright spots. Rage clicks and dead clicks are the highest-value marks on the page, and a map built on a few hundred sessions is noise.",
  "intro": "A heatmap looks like it is telling you something obvious. Red is good, blue is ignored, ship it. That reading is exactly how most people misuse the tool, and it is why I wrote this. I have stared at thousands of these over the years building analytics, and the value is almost never in the bright blob everyone points at first. It is in the parts that contradict what you expected: the button nobody clicks, the dead zone halfway down a page you thought was engaging, the little cluster of angry clicks on an image that was never a link. This is a page about interpretation. If you want the plain definition of what a heatmap is, I keep that separate. Here I want to teach you to read one the way I do, so you stop making layout decisions on colours that do not mean what you assumed.",
  "sections": [
    {
      "type": "h2",
      "text": "Read the three maps as three separate questions",
      "id": "three-maps"
    },
    {
      "type": "p",
      "text": "The single biggest mistake is treating a heatmap as one thing. It is at least three, and each answers a different question. A click map answers where people acted. A scroll map answers how far down they got before leaving. A move map answers where their cursor lingered while they read or hesitated. Bright on one is not bright on another, and reading them as interchangeable is how people talk themselves into the wrong fix."
    },
    {
      "type": "p",
      "text": "So before I look at colour, I decide which question I am asking. If I am trying to work out whether people even see my call to action, that is a scroll question, not a click question. If I am trying to work out whether they understand it once they see it, that is a click question. Getting these straight in your head first saves you from the classic loop of redesigning a button that ninety percent of visitors never scrolled far enough to reach."
    },
    {
      "type": "h2",
      "text": "Click maps: where attention became action",
      "id": "click-maps"
    },
    {
      "type": "p",
      "text": "A click map is the most literal of the three. Every dot is a real tap or click. Warm colour means many people clicked there, cool means few did. Easy so far. The interpretation starts when you ask what a click actually meant, because not all clicks are wins. Microsoft Clarity, for example, breaks its click view into named categories, and those categories are where the useful reading lives."
    },
    {
      "type": "ul",
      "items": [
        "Dead clicks: places where someone clicked and nothing happened. An image that looks like a button, a heading styled like a link, a disabled control with no feedback. Clarity defines these as clicks with no effect or response, and they are a direct map of your interface lying to people about what is interactive.",
        "Rage clicks: rapid repeated clicks in the same small spot in a short burst. This is a person fighting your page. Clarity describes them as clicks made rapidly in the same small area, and they almost always sit on something broken, slow, or misleading.",
        "Error clicks: in Clarity, clicks that land immediately before a JavaScript error fires. If you see heat here, the problem is not design, it is a bug, and no amount of copy tweaking fixes it.",
        "First and last clicks: the first click shows what draws people in on arrival, the last shows where they gave up or left. Reading these two together often tells the whole story of a page in two dots."
      ]
    },
    {
      "type": "p",
      "text": "When I open a click map, I look at the frustrated categories before the popular ones. A wildly clicked hero image that goes nowhere is worth more to me than confirmation that my nav works. The bright spots usually tell me what I already knew. The dead and rage clusters tell me what is quietly costing me conversions."
    },
    {
      "type": "h2",
      "text": "Scroll maps and the fold line",
      "id": "scroll-maps-and-the-fold"
    },
    {
      "type": "p",
      "text": "A scroll map is a fade. It starts warm at the top, where everyone begins, and cools as you go down, because fewer people reach each successive depth. The number that matters is drop-off: the depth at which a big chunk of your audience simply stops. If seventy percent of people never pass the halfway point, everything you buried below it is effectively invisible, no matter how good it is."
    },
    {
      "type": "p",
      "text": "The fold line is where the page gets cut off by the browser window before anyone scrolls. It is not a fixed pixel, because screens differ, but a good scroll map draws an average fold for you. People overreact to it in both directions. One camp crams everything above the fold in a panic. The other insists the fold is dead because everyone scrolls now. The truth is in your own scroll map: some pages hold attention deep, some lose most of the room in the first screen, and you cannot know which you have until you look. I use the fold as a prompt to ask whether the thing I care about most is sitting in a zone people actually reach, not as a rule that everything important must be jammed into the first screenful."
    },
    {
      "type": "h2",
      "text": "Move maps are a proxy for attention, not eye tracking",
      "id": "move-maps"
    },
    {
      "type": "p",
      "text": "Move maps track where the cursor goes on desktop, and they get sold, loosely, as a picture of where people look. Be careful here. The cursor and the eye are related but not the same. Google researchers Rodden, Fu, Aula and Spiro studied this on search results and found that mouse and gaze are coordinated during active reading and scanning, but the cursor also lags, parks in neutral spots, and sometimes just rests wherever a hand left it. So a warm move zone is a reasonable hint that attention passed through, and a cold zone is weak evidence of anything."
    },
    {
      "type": "callout",
      "text": "A move map is not an eye tracker, and any tool that shows one, mine included, is inferring attention from a cursor. Treat it as a hint you confirm against clicks and scroll, never as proof of where someone looked. Real gaze data needs a camera and a lab, which is a different budget and a different question."
    },
    {
      "type": "h2",
      "text": "The mistakes I see people make reading them",
      "id": "common-mistakes"
    },
    {
      "type": "p",
      "text": "Almost every bad decision I have watched someone make from a heatmap comes from one of these. I have made most of them myself."
    },
    {
      "type": "ul",
      "items": [
        "Reading noise as signal. A map built on two hundred sessions is a random pattern that happens to look meaningful. You want a solid sample before you trust the shape, and vendors like Hotjar size their plans around thousands of pageviews for exactly this reason. If the map changes character every time you refresh, you do not have enough data yet.",
        "Averaging away the segments that matter. One heatmap over all traffic blends your mobile and desktop users, your paid and organic, your buyers and your bounces, into a single smear. The interesting differences live in the split. A page that reads fine on desktop can be a disaster on mobile, and the combined map hides it.",
        "Judging a page on one device's map. Layout, fold position and click targets are completely different on a phone. If you only ever look at the desktop view, you are reading the wrong page for most of the modern web.",
        "Confusing popular with effective. The most clicked element is not automatically the one doing the work. People click the logo, the nav, the search box out of habit. Heat is attention, not value, and you still have to decide whether that attention is going where you want.",
        "Skipping straight to redesign. A heatmap tells you where and how much, not why. It is a starting point for a question, not the answer. The move from map to change should always pass through a hypothesis you can then test."
      ]
    },
    {
      "type": "h2",
      "text": "How I actually read one, in order",
      "id": "how-i-read-one"
    },
    {
      "type": "p",
      "text": "Here is the routine I run, roughly the same every time, so I am not just hunting for whatever confirms the change I already wanted to make."
    },
    {
      "type": "ol",
      "items": [
        "Check the sample first. How many sessions is this built on, and over what window. If it is thin, I stop and wait rather than read tea leaves.",
        "Split by device before anything else. I look at mobile and desktop as two separate pages, because they are.",
        "Start on the scroll map. I find the depth where the audience falls away, and I note what sits above and below that line.",
        "Move to the click map, and go to the frustrated clicks first. Dead and rage clusters, then first and last clicks, then the popular elements last.",
        "Use the move map only as a tie-breaker, to sanity-check whether an area I think is ignored is genuinely getting no attention.",
        "Write down one hypothesis, not five. Something like: people are not reaching the pricing block, so I will move it up. Then I change one thing and measure whether behaviour actually shifts."
      ]
    },
    {
      "type": "h2",
      "text": "Where the heatmap stops and the funnel starts",
      "id": "heatmap-vs-funnel"
    },
    {
      "type": "p",
      "text": "A heatmap is a single-page instrument. It is brilliant at telling you what happens on one screen and useless at telling you what happens across a journey. The moment your question becomes where in a multi-step flow people drop out, you have left heatmap territory and you want a funnel. The two are complementary: the funnel tells you which step leaks, and the heatmap tells you what on that step's page is causing the leak. I reach for the funnel to find the wounded page, then a click and scroll map to diagnose it."
    },
    {
      "type": "p",
      "text": "For what it is worth on the tooling: I build Conclick, which renders click and scroll maps over a real screenshot of your page rather than a rebuilt overlay, and measures without cookies. It is built on the open-source Umami engine, which I mention because I would rather you know the lineage than assume it appeared from nowhere. But you can read any heatmap well with the approach above, whichever tool drew it, and that is the point of this page."
    }
  ],
  "faq": [
    {
      "question": "What is the difference between a click map, a scroll map, and a move map?",
      "answer": "They answer three different questions. A click map shows where people actually clicked or tapped, so it measures action. A scroll map shows how far down the page people get before they leave, so it measures reach. A move map tracks where the cursor lingers on desktop, which is a loose proxy for where attention went. Reading them as interchangeable is the most common way people misread a heatmap."
    },
    {
      "question": "What are rage clicks and dead clicks?",
      "answer": "A dead click is a click that produces no effect, usually because something looks interactive but is not, like an image styled as a button. A rage click is a rapid burst of clicks in the same small area, which signals a frustrated person fighting a page that is broken, slow, or misleading. Microsoft Clarity surfaces both as named categories in its click view, and they are usually the highest-value marks on the map."
    },
    {
      "question": "How many visitors do I need before a heatmap is reliable?",
      "answer": "There is no single magic number, but a few hundred sessions is noise, not data. You want a map that keeps roughly the same shape when more data arrives. Vendors size heatmap plans around thousands of pageviews for this reason. If the pattern reorganises itself every time you look, wait for more traffic before you act on it."
    },
    {
      "question": "Does a heatmap show what people actually looked at?",
      "answer": "Not directly. A move map infers attention from cursor position, and research on eye and mouse coordination shows the two are related during active reading but far from identical, since the cursor lags and often rests in neutral spots. True gaze data needs a camera and a controlled test. Treat a move map as a hint you confirm against clicks and scrolling, never as eye tracking."
    },
    {
      "question": "What is the most common mistake when reading a heatmap?",
      "answer": "Reading a thin sample as if it were meaningful, and reading one blended map across all traffic. A pattern built on too few sessions is random, and a single map that mixes mobile and desktop, or buyers and bouncers, hides the very differences worth acting on. Split by device and segment, wait for enough data, and look at the frustrated clicks before the popular ones."
    }
  ],
  "heroWord": "attention",
  "category": "CRO",
  "topics": [
    "heatmaps",
    "cro",
    "user behavior",
    "conversion"
  ],
  "sources": [
    {
      "label": "Microsoft Clarity: Click maps (types, dead / rage / error / first / last clicks)",
      "url": "https://learn.microsoft.com/en-us/clarity/heatmaps/click-maps"
    },
    {
      "label": "Microsoft Clarity: Semantic metrics (rage and dead click definitions)",
      "url": "https://learn.microsoft.com/en-us/clarity/insights/semantic-metrics"
    },
    {
      "label": "Hotjar: Types of heatmaps (click, move, scroll)",
      "url": "https://help.hotjar.com/hc/en-us/articles/36820020346385-Types-of-Heatmaps"
    },
    {
      "label": "Rodden, Fu, Aula & Spiro, Eye-Mouse Coordination Patterns on Web Search Results Pages, CHI 2008",
      "url": "https://research.google/pubs/pub34367"
    },
    {
      "label": "Nielsen Norman Group: F-Shaped Pattern of Reading Web Content",
      "url": "https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/"
    }
  ],
  "internalLinks": [
    {
      "href": "/glossary/heatmap",
      "label": "What a website heatmap is",
      "group": "glossary"
    },
    {
      "href": "/guides/how-to-read-a-funnel",
      "label": "How to read a conversion funnel",
      "group": "guide"
    },
    {
      "href": "/guides/do-heatmaps-need-cookie-consent",
      "label": "Do heatmaps need cookie consent?",
      "group": "guide"
    },
    {
      "href": "/glossary/conversion-funnel",
      "label": "Conversion funnel, defined",
      "group": "glossary"
    },
    {
      "href": "/vs/hotjar",
      "label": "Conclick vs Hotjar",
      "group": "comparison"
    },
    {
      "href": "/vs/clarity",
      "label": "Conclick vs Microsoft Clarity",
      "group": "comparison"
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
