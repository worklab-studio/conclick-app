import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  "type": "glossary",
  "slug": "utm",
  "h1": "UTM Parameters: What They Are, Why They Matter, and How to Use Them Right",
  "metaTitle": "UTM Parameters Explained: The Complete Guide",
  "metaDescription": "UTM parameters are URL tags that tell your analytics exactly which campaign drove a visit. How to build them right and avoid mistakes that corrupt data.",
  "tldr": "UTM parameters are short tags you append to a URL that tell your analytics tool exactly where a visitor came from and which campaign sent them. Without them, traffic from your email, ads, and social posts collapses into one undifferentiated blob, and you have no idea what is actually working.",
  "intro": "Every time you share a link and have no idea whether it drove revenue or just tire-kickers, you are flying blind. UTM parameters are the fix. They are the simplest, most reliable way to answer the question every founder eventually asks: which of my marketing channels is actually making me money?",
  "sections": [
    {
      "type": "h2",
      "text": "What UTM Parameters Actually Are",
      "id": "what-are-utm-parameters"
    },
    {
      "type": "p",
      "text": "UTM stands for Urchin Tracking Module. Urchin was a web analytics company Google acquired in 2005, and the naming convention it invented became the de facto standard across every analytics platform. The name is historical trivia; the mechanism is what matters."
    },
    {
      "type": "p",
      "text": "A UTM parameter is a query string key-value pair appended to a URL. When a visitor clicks that URL, the analytics script reads those parameters from the browser address bar and records them alongside the pageview. Nothing is stored on the server. The entire mechanism lives in the URL itself."
    },
    {
      "type": "p",
      "text": "There are five standard parameters:"
    },
    {
      "type": "ul",
      "items": [
        "utm_source: where the traffic is coming from. Examples: newsletter, twitter, google, producthunt.",
        "utm_medium: the marketing channel type. Examples: email, cpc, social, banner, affiliate.",
        "utm_campaign: the name of the specific campaign or promotion. Examples: spring-sale, v2-launch, black-friday.",
        "utm_content: used to differentiate between multiple links in the same campaign, such as two different CTAs in one email. Optional.",
        "utm_term: originally designed for paid search keyword tracking. Rarely needed outside of Google Ads. Optional."
      ]
    },
    {
      "type": "p",
      "text": "A fully-tagged URL looks like this: https://yoursite.com/pricing?utm_source=newsletter&utm_medium=email&utm_campaign=v2-launch&utm_content=top-cta. It is ugly. That is fine. Your visitors never read the URL bar."
    },
    {
      "type": "h2",
      "text": "Why UTM Parameters Matter for Growth",
      "id": "why-utm-parameters-matter"
    },
    {
      "type": "p",
      "text": "Without these tags, your analytics tool has to guess where traffic came from using the HTTP referrer header. That header is unreliable. Email clients strip it. Many browsers suppress it for cross-origin requests. HTTPS-to-HTTP transitions drop it. Links shared in Slack, iMessage, or a PDF have no referrer at all. The result is a bucket called ['direct / none'](/guides/organic-traffic-showing-as-direct) that swells with misattributed traffic and gives you nothing actionable."
    },
    {
      "type": "p",
      "text": "With tagged links, attribution is deterministic. You tagged the link, so you know exactly what it was. If 200 people clicked your Product Hunt launch post and 12 of them signed up for a trial, you can see that directly in your dashboard. More importantly, you can see whether those 12 turned into paying customers, or whether your highest-converting campaign was actually the obscure podcast ad you almost cancelled."
    },
    {
      "type": "callout",
      "text": "Traffic volume is vanity. What these tags let you measure is [revenue per channel](/glossary/revenue-attribution): which campaigns earn money versus which ones just burn it."
    },
    {
      "type": "h2",
      "text": "How to Build and Use UTM Parameters Correctly",
      "id": "how-to-build-utm-parameters"
    },
    {
      "type": "p",
      "text": "Google has a free URL Builder, most analytics platforms have one built in, and there is a [free UTM builder](/tools/utm-builder) on this site too. But the tool is secondary. The discipline is what matters. Every link you share publicly (in an email, an ad, a social post, a bio, a press release) should carry the tags. No exceptions."
    },
    {
      "type": "h3",
      "text": "Establish a naming convention before you tag your first link",
      "id": "establish-a-naming-convention-before-you-tag-your-first-link"
    },
    {
      "type": "p",
      "text": "This is where most teams go wrong. They start tagging inconsistently (Twitter vs twitter vs TW) and within a month they have three different segments that should be one. Decide on lowercase-with-hyphens, document it somewhere your whole team can see, and enforce it. Capitalized and lowercase variants of the same source are different values in every analytics tool."
    },
    {
      "type": "h3",
      "text": "Match source and medium consistently",
      "id": "match-source-and-medium-consistently"
    },
    {
      "type": "p",
      "text": "The source is who sent the traffic; the medium is the channel type. Source google with medium cpc means paid Google search. Source google with medium organic makes no sense: organic Google traffic arrives via the referrer, not a tag. For email, the source is typically the platform or list segment (say, weekly-digest) and the medium is always email."
    },
    {
      "type": "h3",
      "text": "Tag every outbound link in every email",
      "id": "tag-every-outbound-link-in-every-email"
    },
    {
      "type": "p",
      "text": "Email is the single highest-ROI channel for most SaaS and ecommerce businesses, and it is also the channel most likely to get misattributed to 'direct' if you do not tag it. Every link in every email should carry source, medium=email, and campaign values at minimum. If you have multiple CTAs in one email, use the content tag to tell them apart."
    },
    {
      "type": "h3",
      "text": "Do not UTM-tag internal links",
      "id": "do-not-utm-tag-internal-links"
    },
    {
      "type": "p",
      "text": "Putting UTM parameters on links between pages of your own site is one of the most destructive mistakes in analytics. It overwrites the original session source. A visitor who arrived from your newsletter and then clicked an internal link tagged homepage-banner now appears as a new session from homepage-banner, and your newsletter gets no credit for the conversion. These tags are for external traffic only."
    },
    {
      "type": "h2",
      "text": "Common UTM Mistakes That Corrupt Your Data",
      "id": "common-utm-mistakes"
    },
    {
      "type": "ol",
      "items": [
        "Inconsistent capitalization. Analytics tools treat utm_source=Twitter and utm_source=twitter as separate sources. Always lowercase.",
        "Tagging internal links. This kills attribution for whatever channel originally sent the visitor.",
        "Missing parameters on paid campaigns. If your Google or Meta ads are not auto-tagged or manually UTM-tagged, you cannot separate paid traffic from organic in your analytics.",
        "Using the campaign field as a dumping ground. 'Q3' is not a campaign name. 'q3-retargeting-saas-trial-cta' is.",
        "Sharing UTM-tagged links in social posts without thinking. Twitter, LinkedIn, and Reddit sometimes strip or shorten URLs, and users who copy your link will spread the tags everywhere, including to people who have nothing to do with your campaign. That inflates campaign numbers.",
        "Forgetting to tag redirect links. If you use a link shortener or a redirect service, the tags must survive the redirect. Test them."
      ]
    },
    {
      "type": "h2",
      "text": "UTM Parameters and Revenue Attribution",
      "id": "utm-and-revenue-attribution"
    },
    {
      "type": "p",
      "text": "Tracking clicks and visits is useful. Tracking which tagged source drove actual revenue is the thing that changes how you spend your time and money. This requires connecting your analytics tool to your payment processor."
    },
    {
      "type": "p",
      "text": "The typical flow: visitor arrives via UTM-tagged link, your analytics script stores that campaign data (usually in a first-party cookie or localStorage), visitor converts and pays, your payment webhook fires, your analytics platform matches the payment to the stored source data. The result is a table that says: 'This email campaign drove $3,400 in MRR. That Twitter thread drove $120 and 40 hours of support tickets.'"
    },
    {
      "type": "p",
      "text": "Most analytics tools show you UTM-to-pageview attribution out of the box. UTM-to-revenue attribution requires integration work. A few tools handle it natively; Conclick is one of them. If you connect your payment processor (Stripe, Paddle, Lemon Squeezy, Dodo, or Polar), it automatically ties every payment back to the originating UTM source, medium, and campaign. So instead of knowing that your Product Hunt post drove traffic, you know it drove $840 in first-week revenue. That is a different kind of information."
    },
    {
      "type": "h2",
      "text": "A Note on UTM Parameters and Privacy",
      "id": "utm-and-privacy"
    },
    {
      "type": "p",
      "text": "UTM parameters themselves are not a privacy concern; they are just URL strings. The privacy question is how your analytics tool processes and stores the associated data. If your tool uses third-party cookies or fingerprinting to stitch sessions across visits, that creates GDPR/CCPA issues. If it processes everything server-side with first-party data and no cross-site tracking, it generally does not."
    },
    {
      "type": "p",
      "text": "One practical issue: the tags appear in the URL bar, browser history, and server logs. If someone forwards an email with UTM-tagged links, those tags travel with the link. That can inflate campaign data. It is not a security risk, but it is worth knowing."
    }
  ],
  "faq": [
    {
      "question": "Do UTM parameters affect SEO?",
      "answer": "They do not directly affect rankings. Googlebot ignores UTM parameters when crawling and typically canonicalizes the clean URL. However, if you share UTM-tagged URLs widely and they get indexed, you could end up with duplicate content issues. The safe practice is to add a canonical tag to your pages pointing to the clean URL, which most CMS platforms do by default."
    },
    {
      "question": "What is the difference between utm_source and utm_medium?",
      "answer": "The source is who sent the traffic: a specific newsletter, a platform like Twitter, a partner site. The medium is the type of channel: email, cpc, social, affiliate. Think of it as: source = the sender, medium = the delivery method. utm_source=weekly-digest&utm_medium=email means 'from my weekly digest newsletter, delivered by email.'"
    },
    {
      "question": "How long do UTM parameters persist in analytics tools?",
      "answer": "It depends on the tool and how it is configured. In Google Analytics 4, the session expires after 30 minutes of inactivity by default, and campaign attribution is scoped to the session. Other tools may store the first-touch tags in a cookie or localStorage for days or weeks, allowing them to attribute a conversion even if the visitor returns days later. For SaaS with longer consideration cycles, last-touch attribution from a short session window can significantly undercount the value of upper-funnel campaigns."
    },
    {
      "question": "Should I use UTM parameters on Google Ads?",
      "answer": "Google Ads has its own auto-tagging system using the gclid parameter, which passes richer data into Google Analytics than UTM parameters can. If you are using GA4, auto-tagging is usually better than manual tagging for Google Ads. However, if you are using a non-Google analytics tool, you should also add UTM parameters to your Google Ads URLs, because those tools cannot read the gclid."
    },
    {
      "question": "What happens if a visitor arrives without UTM parameters?",
      "answer": "Your analytics tool falls back to the HTTP referrer header. If a referrer is present and recognized (e.g., google.com for organic search, twitter.com for social), it will be categorized accordingly. If there is no referrer, which is common for email, direct navigation, or links shared in apps, the visit is recorded as 'direct.' This is why tagging email campaigns is non-negotiable: email clients almost never send a useful referrer."
    },
    {
      "question": "Can I use UTM parameters on links in my own app or product?",
      "answer": "You should not use UTM parameters on links within your website or web app. Doing so creates a new session in most analytics tools and overwrites the original attribution source, destroying your ability to trace conversions back to the campaign that originally acquired the user. If you want to track where within your product users click, use event tracking or internal link tracking instead."
    }
  ],
  "internalLinks": [
    {
      "href": "/tools/utm-builder",
      "label": "Free UTM Builder Tool",
      "group": "tool"
    },
    {
      "href": "/glossary/marketing-attribution",
      "label": "Marketing Attribution Models Explained",
      "group": "glossary"
    },
    {
      "href": "/guides/organic-traffic-showing-as-direct",
      "label": "When Organic Traffic Shows Up as Direct",
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
