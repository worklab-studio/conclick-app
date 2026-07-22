import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "guide",
  "slug": "gdpr-analytics-checklist",
  "h1": "The GDPR-Compliant Analytics Checklist for 2026",
  "metaTitle": "GDPR-Compliant Analytics Checklist for 2026",
  "metaDescription": "A founder's blunt, step-by-step checklist for running legal, useful analytics in 2026: no legal jargon, no cookie-banner theatre, just what actually works.",
  "tldr": "In 2026, most small teams are either over-collecting (and need expensive consent infrastructure) or so paranoid they have no useful data left. The fix is to default to cookieless, session-scoped analytics for most of your measurement needs, add consent only where you truly need cookies, and document your lawful basis. This checklist walks through exactly that in the order that matters.",
  "intro": "I spent more time than I'd like to admit reading DPA guidance documents, enforcement decisions, and noyb complaint filings so you don't have to. Here is what I actually learned: GDPR compliance for analytics is mostly about data minimisation, not banner design. Get the architecture right and the compliance largely follows.",
  "sections": [
    {
      "type": "h2",
      "text": "Why 2026 Is Different From 2018",
      "id": "why-2026-is-different"
    },
    {
      "type": "p",
      "text": "The early GDPR years were a land-grab for data protection authorities. They went after the obvious targets: adtech, large publishers, Meta. Since 2024, enforcement has moved down-market. Austrian, Dutch, and Irish DPAs have issued findings against mid-sized SaaS companies. The 'we're too small to matter' argument is not a legal defence, and DPAs have made that clear.\n\nThe other shift is consent fatigue. Studies consistently show that users [dismiss consent banners](/blog/cookie-banners-killing-your-data) in under 2 seconds. More relevant to you: the EU's updated ePrivacy enforcement guidance treats dark patterns (pre-ticked boxes, buried reject options, consent walls) as automatic violations regardless of your cookie notice wording. If you're running a standard Google Analytics setup with a Cookiebot banner, you are probably still non-compliant in at least three member states."
    },
    {
      "type": "h2",
      "text": "Step 1: Choose Your Lawful Basis Before You Choose Your Tool",
      "id": "lawful-basis-first"
    },
    {
      "type": "p",
      "text": "This sounds obvious. Almost nobody does it. The lawful basis determines every other decision: which tool you can use, whether you need a banner, what your retention period should be, how you respond to a subject access request."
    },
    {
      "type": "ul",
      "items": [
        "Consent (Article 6(1)(a)): required whenever you use persistent identifiers (cookies, fingerprints, localStorage) to track behaviour. Valid consent must be freely given, specific, informed, and unambiguous. Pre-ticked boxes are invalid. Bundled consent ('accept all to use the site') is almost certainly invalid.",
        "Legitimate interests (Article 6(1)(f)): possible for analytics that don't involve cross-site tracking and where you've run a genuine LIA (Legitimate Interests Assessment). Not a magic escape hatch: the 'balancing test' must actually be documented.",
        "Strictly necessary: not a lawful basis for analytics. This applies to session cookies that make your site function, not your pageview counter."
      ]
    },
    {
      "type": "p",
      "text": "For most bootstrapped founders doing first-party analytics only, legitimate interests is viable, but you have to document it. A one-paragraph internal note is enough for most DPAs. Write it down, date it, store it somewhere you can find it."
    },
    {
      "type": "h2",
      "text": "Step 2: Actually Minimise the Data You Collect",
      "id": "data-minimisation"
    },
    {
      "type": "p",
      "text": "GDPR Article 5(1)(c) says you must collect the minimum data necessary for your stated purpose. This is where most analytics setups fail, not in banner design. Here is the practical checklist."
    },
    {
      "type": "ol",
      "items": [
        "Do not store full IP addresses. Truncate to /24 (IPv4) or /48 (IPv6). If your tool stores the full IP even temporarily before hashing, that is still a data collection event under GDPR.",
        "Do not create persistent cross-session identifiers unless you have explicit consent. A cookieless tool that generates a daily-rotating hash of IP + user agent is fine. A tool that writes a UUID to localStorage and keeps it for 2 years is not.",
        "Disable user-ID tracking unless you have a contractual basis (i.e., logged-in users in your own product). Mixing anonymous browsing data with user-level data is a common mistake.",
        "Set an explicit data retention period and enforce it. 90 days of session data is enough for most funnel analysis. 13 months is the max most DPAs will accept without scrutiny.",
        "Audit any custom events you're sending. Every property you attach to a custom event is personal data if it can be combined with other data to identify someone. Do not send email addresses, user names, or internal IDs through your analytics layer."
      ]
    },
    {
      "type": "h2",
      "text": "Step 3: Check Your Data Processing Agreements",
      "id": "processor-agreements"
    },
    {
      "type": "p",
      "text": "If you use a third-party analytics tool, they are a data processor and you need a signed DPA (Data Processing Agreement) on file. Most SaaS analytics vendors provide these in their account settings or legal pages. Sign it. Keep a copy.\n\nThe second issue is data transfers. If your analytics vendor stores data in the US and you have EU visitors, you need a transfer mechanism. Standard Contractual Clauses (SCCs) are the practical answer for most vendors. Check that your vendor has current SCCs in their DPA. Anything signed before June 2021 uses the old SCCs, which are no longer valid. Plausible, Fathom, and most EU-hosted tools avoid this entirely by staying in the EU. Google Analytics 4 with US data storage technically requires SCCs and a Transfer Impact Assessment, and several European DPAs (Austria, Italy, France) have found that even with SCCs in place, GA4 does not meet the standard. That is a real legal risk, not a theoretical one."
    },
    {
      "type": "callout",
      "text": "The Austrian DSB ruling on Google Analytics was not about cookie banners. It was about the fact that IP addresses, even hashed ones, reached Google servers in the US, and Google is subject to FISA 702, which means US intelligence services can compel access. SCCs cannot fix a structural surveillance problem. If you have EU visitors and meaningful GDPR exposure, hosting your analytics data in the EU is the only clean answer."
    },
    {
      "type": "h2",
      "text": "Step 4: If You Do Need a Consent Banner, Do It Right",
      "id": "consent-banner-if-needed"
    },
    {
      "type": "p",
      "text": "If you're running retargeting pixels, affiliate tracking, or any cross-site analytics, you need real consent. Here is what that actually requires in 2026."
    },
    {
      "type": "ul",
      "items": [
        "Reject must be as easy to click as Accept. Same visual weight, same number of steps.",
        "No pre-selected categories. Everything off by default.",
        "Granular categories: analytics cookies and advertising cookies must be separate choices.",
        "Record consent with a timestamp, the banner version shown, and what the user chose. Store this log.",
        "Honor the Global Privacy Control (GPC) signal automatically. Firefox, Brave, and DuckDuckGo send this by default. Several US states now require you to respect it, and the EDPB has signalled it should be treated as a valid opt-out in the EU too.",
        "Make it genuinely easy to withdraw consent. A link in your footer to re-open the consent manager is the minimum."
      ]
    },
    {
      "type": "p",
      "text": "If your current setup does not meet all six of those criteria, you are running an invalid consent mechanism regardless of what your Cookiebot plan says."
    },
    {
      "type": "h2",
      "text": "Step 5: Consider Whether You Need Cookies at All",
      "id": "cookieless-approach"
    },
    {
      "type": "p",
      "text": "For most SaaS and ecommerce products, you don't. [Cookieless analytics](/glossary/cookieless-analytics) tools have matured significantly. They track pageviews, referrers, UTM parameters, conversions, and revenue attribution accurately without persistent identifiers. The main things you lose compared to a cookie-based setup are cross-device user stitching, very long return-visitor windows beyond about 24 hours, and A/B test identity consistency. Those are real limitations, but they matter less than most people assume for the day-to-day analysis that drives decisions.\n\nI built Conclick to be cookieless by default because I wanted to use it on my own products without the consent overhead. It does revenue attribution by connecting directly to your payment processor (Stripe, Paddle, Polar, Lemon Squeezy, Dodo) and matching payment events to the source, campaign, and funnel that preceded them, without needing to track users across sessions with a cookie. For most bootstrapped teams, the question worth asking is not 'which cookie tool complies?' but 'do I actually need cookies to answer the questions I care about?' Usually the answer is no."
    },
    {
      "type": "h2",
      "text": "Step 6: Update Your Privacy Policy to Match Reality",
      "id": "privacy-policy"
    },
    {
      "type": "p",
      "text": "Your privacy policy is a legal document under GDPR Articles 13 and 14. It must accurately reflect what you actually collect. Boilerplate privacy policies that list every possible cookie under the sun when you've switched to cookieless analytics are not just useless; they're a liability, because they assert things that aren't true. Check that your policy accurately names the analytics tools you use, states your lawful basis for each purpose, gives the data retention period, and names your data processor (the analytics vendor). A subject access request will expose a mismatch between your policy and reality immediately."
    },
    {
      "type": "h2",
      "text": "Step 7: Build a 30-Minute Annual Review Into Your Calendar",
      "id": "annual-review"
    },
    {
      "type": "p",
      "text": "GDPR is not a one-time project. Once a year, spend 30 minutes checking: have you added any new third-party scripts? Have any vendor DPAs expired or changed? Did you add any new custom event properties that include personal data? Has your data retention actually been enforced, or is your database holding three years of session data because nobody set up the deletion job? Most small teams fail compliance audits not because of their initial setup but because of drift."
    }
  ],
  "faq": [
    {
      "question": "Does Google Analytics 4 comply with GDPR in 2026?",
      "answer": "It depends on your configuration and which EU member state's DPA you're asking about. Austrian, Italian, French, and Danish DPAs have all found standard GA4 configurations to be non-compliant, primarily because IP address data reaches Google servers in the US where FISA 702 applies. Google's IP anonymisation feature has been found insufficient because anonymisation happens after the IP reaches Google's servers. If you operate in those countries and have meaningful traffic or revenue there, GA4 US-data-storage is a real legal risk. If you need GA4 for its ad attribution features, run it only on opt-in consent and document that consent carefully."
    },
    {
      "question": "Can I use legitimate interests as a lawful basis for analytics without a cookie banner?",
      "answer": "Possibly, but only for cookieless analytics that don't involve persistent cross-session tracking. The EDPB's 2022 guidance on legitimate interests makes clear that placing a cookie for analytics purposes requires consent, not LI. Cookieless tools that rely on aggregate, session-scoped data and don't create persistent identifiers have a stronger case for LI, but you must document a Legitimate Interests Assessment, state it in your privacy policy, and offer an easy opt-out. This is not a blanket exemption; it requires genuine documentation and a real balancing test."
    },
    {
      "question": "What is the Global Privacy Control and do I have to respect it?",
      "answer": "The Global Privacy Control (GPC) is a browser signal that tells websites the user opts out of data sale and sharing. It's already legally required in California (CCPA/CPRA), Colorado, and Connecticut, and several other US states are moving in the same direction. The EDPB has indicated it should be treated as a valid withdrawal of consent under GDPR as well. In practice, you need to detect the GPC header (Sec-GPC: 1) server-side or the navigator.globalPrivacyControl JavaScript property client-side, and suppress any non-essential tracking when it's present. Most privacy-first analytics tools handle this automatically."
    },
    {
      "question": "How long can I legally retain analytics data?",
      "answer": "GDPR requires 'storage limitation': data should not be kept longer than necessary for the purpose. For analytics, most DPAs treat 13 months as the outer limit for cookie-based data (aligning with one full annual cycle), and several guidance documents suggest 6 months is more defensible for session-level data. Aggregated data with no personal data attached can be kept indefinitely. In practice: set your raw session data to delete after 90 days, aggregate into monthly summaries, and you'll be well within any DPA's expectations. The key thing is to actually enforce the retention period with an automated deletion job, not just write a number in your privacy policy."
    },
    {
      "question": "Do I need a Data Processing Agreement with my analytics vendor?",
      "answer": "Yes, always. Under GDPR Article 28, whenever you share personal data with a third party that processes it on your behalf, you need a written DPA. Most analytics vendors provide a DPA in their settings or legal pages; sign it and save a copy. If your vendor is US-based and stores EU visitor data in the US, the DPA must also include Standard Contractual Clauses (the 2021 SCCs, not the old ones). Check the date on any SCCs you've previously signed. If they predate June 2021, they're the deprecated version and technically invalid."
    },
    {
      "question": "My site has very little EU traffic. Do I still need to comply with GDPR?",
      "answer": "GDPR applies when you deliberately target EU residents, regardless of where your company is incorporated. 'Deliberately targeting' includes accepting payment in Euros, offering the site in EU languages beyond English, or mentioning EU-specific topics. If your SaaS or ecommerce site is in English only, priced in USD, and you have genuinely never marketed to EU countries, your exposure is low, but not zero, because EU residents can still find and use your site. The more pragmatic answer is that privacy-first analytics costs you nothing extra in the cookieless world, so the question of whether you're technically obliged to comply matters less when compliance requires no additional effort."
    }
  ],
  "internalLinks": [
    {
      "href": "/glossary/gdpr-compliant-analytics",
      "label": "What GDPR-compliant analytics means",
      "group": "glossary"
    },
    {
      "href": "/glossary/cookieless-analytics",
      "label": "Cookieless analytics, explained",
      "group": "glossary"
    },
    {
      "href": "/guides/do-heatmaps-need-cookie-consent",
      "label": "Do heatmaps need cookie consent?",
      "group": "guide"
    },
    {
      "href": "/blog/cookie-banners-killing-your-data",
      "label": "Cookie banners are killing your data",
      "group": "blog"
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
  "datePublished": "2026-06-18",
  "dateModified": "2026-07-22"
};

export default entry;
