import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "do-heatmaps-need-cookie-consent",
  "h1": "Do Heatmaps Need Cookie Consent? What Each Tool Actually Sets",
  "metaTitle": "Do Heatmaps Need Cookie Consent? A Per-Tool Answer",
  "metaDescription": "Most heatmap tools set cookies and need consent in the EU and UK. Here is what each one stores, and why a consent-gated heatmap is biased, not just smaller.",
  "primaryKeyword": "do heatmaps need cookie consent",
  "tldr": "It depends on what the tool stores, not what its marketing says. Hotjar and Microsoft Clarity set cookies and need consent in the EEA, UK and Switzerland, which Microsoft has enforced since 31 October 2025. Aggregate heatmaps are a lighter case than session replay. And the real cost is not legal: a heatmap that fires only after someone accepts a banner shows you accept-clickers, not visitors.",
  "intro": "I spent a while trying to get a straight answer to this question and could not find one, so I went and checked the cookie tables myself. Almost every article about privacy-friendly heatmaps lists tools and repeats each vendor's own compliance claim. Nobody looks at what the script actually stores in the browser. That is the only thing that decides whether you need a banner, so this page starts there and stays specific.",
  "sections": [
    {
      "type": "h2",
      "text": "The short answer",
      "id": "the-short-answer"
    },
    {
      "type": "p",
      "text": "If a heatmap tool stores an identifier on the visitor's device, and that storage is not strictly necessary to deliver the service the visitor asked for, then under the ePrivacy Directive you need consent before it runs. That is a storage question, not an analytics question, which is why \"is it GDPR compliant\" is the wrong thing to ask a vendor. The right question is: what exactly do you write to my visitor's browser, and how long does it live?"
    },
    {
      "type": "p",
      "text": "Two tools can both be honestly described as privacy-friendly and still land on opposite sides of that line."
    },
    {
      "type": "h2",
      "text": "What the major tools actually store",
      "id": "what-the-major-tools-actually-store"
    },
    {
      "type": "p",
      "text": "This is from each vendor's own documentation rather than from roundups. Check it yourself before you rely on it, because vendors change this and I would rather you verify than trust me."
    },
    {
      "type": "ul",
      "items": [
        "Microsoft Clarity sets _clck, which recognises a visitor across visits, and _clsk, which groups activity into a session. Microsoft began enforcing consent for visitors in the EEA, UK and Switzerland on 31 October 2025, and provides a Consent V2 API for signalling it. Without a consent signal, Clarity runs in a limited mode.",
        "Hotjar sets tracking cookies, and its own guidance is explicit that the site owner is the data controller and is responsible for obtaining consent. The compliance burden is yours, not theirs.",
        "Matomo does not set a cookie for heatmaps alone, but its own FAQ states that recording sessions sets a first-party cookie named _pk_hsr for the duration of the visit. Heatmaps and session recording are the same product but not the same legal question.",
        "Plausible's own page on when it is not the right fit (linked in the sources below) says it does not record individual visitor sessions, and lists mouse movement recordings, rage click detection and heatmaps among the things it deliberately leaves out. If you want heatmaps, it is not the tool.",
        "Conclick measures without cookies and without a cross-site profile. It does keep a first-party visitor identifier in the browser's local storage so a session holds together. That is not a cookie, but it is a persistent client-side identifier, and I would rather say so than let you assume otherwise."
      ]
    },
    {
      "type": "callout",
      "text": "Nobody on this page can tell you whether you personally need a banner. That depends on your jurisdiction, what else you load, and how you have configured the tool. Ask a lawyer before you act on any of it, including mine."
    },
    {
      "type": "h2",
      "text": "Heatmaps and session replay are not the same question",
      "id": "heatmaps-and-session-replay-are-not-the-same-question"
    },
    {
      "type": "p",
      "text": "Tools sell these together, which makes them sound like one feature with one compliance answer. Legally they are quite different."
    },
    {
      "type": "p",
      "text": "An aggregate heatmap is a count. Four hundred people clicked in this region, the median visitor scrolled to sixty percent of the page. No individual is reconstructable from it. A session replay is a recording of one identifiable person moving through your site, including what they typed if you have not masked inputs correctly. The second is a much harder thing to defend, and it is the one that tends to attract regulator attention."
    },
    {
      "type": "p",
      "text": "The CNIL's guidance on analytics exemptions is instructive here mostly for what it does not cover: its conditions are written for audience measurement and A/B testing, and it does not address session recording at all. Read that as a signal about where the safe ground is."
    },
    {
      "type": "h2",
      "text": "The real cost is biased data, not legal risk",
      "id": "the-real-cost-is-biased-data"
    },
    {
      "type": "p",
      "text": "This is the part that made me care about the question, and it has nothing to do with compliance."
    },
    {
      "type": "p",
      "text": "If your heatmap only fires after someone accepts a cookie banner, you are not collecting less data. You are collecting a skewed sample. The people who click Accept are not a random subset of your visitors. They skew toward people who are less privacy-aware, less technical, on older browsers, in jurisdictions without a banner requirement at all. Those are exactly the differences that show up in where people click and how far they scroll."
    },
    {
      "type": "p",
      "text": "So the heatmap you are staring at is not a picture of your visitors. It is a picture of your consenting visitors, presented as though it were the whole. You will make layout decisions on it and never see the error, because a biased heatmap looks exactly as convincing as an accurate one."
    },
    {
      "type": "p",
      "text": "That is the argument for measuring without a banner where you legitimately can: not that it is more legal, but that it is more true."
    },
    {
      "type": "h2",
      "text": "How to decide for your own site",
      "id": "how-to-decide-for-your-own-site"
    },
    {
      "type": "ol",
      "items": [
        "Open your site in a private window with devtools on the Application tab. Look at what is actually in Cookies and Local Storage after the page loads. This takes two minutes and beats any vendor claim.",
        "Separate your requirements. If you need aggregate click and scroll behaviour, that is a lighter ask than replaying individual sessions, and you may not need replay at all.",
        "Check whether the tool can run in a reduced mode without consent, and what you lose. Clarity's limited mode and Matomo's heatmap-without-replay configuration are both real options.",
        "Ask what happens to visitors who decline, and whether your analytics silently drops them or counts them anonymously.",
        "Get the answer reviewed by someone qualified in your jurisdiction before you remove a banner."
      ]
    },
    {
      "type": "h2",
      "text": "Where Conclick sits",
      "id": "where-conclick-sits"
    },
    {
      "type": "p",
      "text": "I build Conclick, so treat this section as what it is. Conclick renders click maps and scroll depth over a real screenshot of the page rather than a reconstructed overlay, measures without cookies, and keeps data on our servers. It also ties payments from Stripe, Paddle, Polar, Lemon Squeezy and Dodo back to the source and campaign that produced them, which is the thing I actually built it for."
    },
    {
      "type": "p",
      "text": "It is not the only privacy-positioned tool with heatmaps, and I would be lying if I said otherwise. Matomo has had them for years and is a genuinely good product, particularly if you want to self-host. TWIPLA, Piwik PRO and Clicky all belong in the conversation too. If your question is purely which heatmap respects privacy, several answers are defensible. If your question is which one also tells you that the visitor who scrolled to the pricing table later paid you forty-nine dollars, the field narrows considerably."
    },
    {
      "type": "p",
      "text": "Conclick is built on the open-source Umami engine, which I mention wherever it is relevant rather than only where it flatters us."
    }
  ],
  "faq": [
    {
      "question": "Do heatmaps need cookie consent under GDPR?",
      "answer": "It depends on whether the tool stores something on the visitor's device. Under the ePrivacy Directive, consent is required for non-essential storage, and heatmap tools that set tracking cookies generally fall into that category. A tool that stores nothing, or stores only what is strictly necessary, is a different case. This is not legal advice and the answer varies by jurisdiction and configuration."
    },
    {
      "question": "Does Microsoft Clarity require a cookie banner?",
      "answer": "Clarity sets the _clck and _clsk cookies, and Microsoft began enforcing consent for visitors in the EEA, UK and Switzerland on 31 October 2025. It provides a Consent V2 API for passing a consent signal, and runs in a limited mode when no signal is present."
    },
    {
      "question": "What is the difference between a heatmap and a session recording, legally?",
      "answer": "An aggregate heatmap is a count that no individual can be reconstructed from. A session recording is a replay of one identifiable person's behaviour, potentially including form input. The second carries substantially more risk, and the CNIL's analytics exemption guidance is written around audience measurement and A/B testing without addressing session recording at all."
    },
    {
      "question": "Does Plausible have heatmaps?",
      "answer": "No. Plausible states directly that it does not record individual visitor sessions, and that there are no mouse movement recordings, rage click detection or heatmaps. It is a lightweight pageview and goal analytics tool by design."
    },
    {
      "question": "Are cookieless heatmaps as accurate as cookie-based ones?",
      "answer": "For aggregate click and scroll behaviour they are typically more accurate in practice, because they measure every visitor rather than only the ones who accepted a banner. Where cookieless measurement is weaker is stitching one person across multiple visits over time, which matters for long consideration cycles."
    },
    {
      "question": "Can I run heatmaps without a consent banner?",
      "answer": "Sometimes, depending on your jurisdiction, the tool's storage behaviour and how you configure it. Some tools can run in a reduced mode that avoids non-essential storage. Do not take a vendor's compliance page as a determination for your own site, and have it reviewed before you remove a banner."
    }
  ],
  "heroWord": "consent",
  "category": "Privacy",
  "topics": [
    "heatmaps",
    "cookie consent",
    "gdpr",
    "privacy"
  ],
  "sources": [
    {
      "label": "CNIL, Sheet n°16: Use analytics on your websites and applications",
      "url": "https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications"
    },
    {
      "label": "Matomo FAQ: Does Heatmap & Session Recording set any cookies?",
      "url": "https://matomo.org/faq/heatmap-session-recording/faq_24303/"
    },
    {
      "label": "Matomo: Heatmaps and behaviour analytics",
      "url": "https://matomo.org/features/behaviour-analytics-heatmaps/"
    },
    {
      "label": "Plausible: When Plausible is not the right fit",
      "url": "https://plausible.io/when-not-to-use-plausible"
    },
    {
      "label": "Hotjar: Cookies set by the Hotjar tracking code",
      "url": "https://help.hotjar.com/hc/en-us/articles/36819973371409-Cookies-Set-by-the-Hotjar-Tracking-Code"
    }
  ],
  "internalLinks": [
    {
      "href": "/glossary/heatmap",
      "label": "What a website heatmap is",
      "group": "glossary"
    },
    {
      "href": "/glossary/cookieless-analytics",
      "label": "What cookieless analytics means",
      "group": "glossary"
    },
    {
      "href": "/glossary/gdpr-compliant-analytics",
      "label": "GDPR-compliant analytics, explained",
      "group": "glossary"
    },
    {
      "href": "/guides/gdpr-analytics-checklist",
      "label": "The GDPR analytics checklist",
      "group": "guide"
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
  "datePublished": "2026-07-21",
  "dateModified": "2026-07-21"
};

export default entry;
