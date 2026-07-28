(window => {
  const {
    screen: { width, height },
    navigator: { language, doNotTrack: ndnt, msDoNotTrack: msdnt },
    location,
    document,
    history,
    top,
    doNotTrack,
  } = window;
  const { currentScript, referrer } = document;
  if (!currentScript) return;

  const { hostname, href, origin } = location;
  const localStorage = href.startsWith('data:') ? undefined : window.localStorage;

  const _data = 'data-';
  const _false = 'false';
  const _true = 'true';
  const attr = currentScript.getAttribute.bind(currentScript);

  const website = attr(_data + 'website-id');
  const hostUrl = attr(_data + 'host-url');
  const beforeSend = attr(_data + 'before-send');
  const tag = attr(_data + 'tag') || undefined;
  const autoTrack = attr(_data + 'auto-track') !== _false;
  const dnt = attr(_data + 'do-not-track') === _true;
  const excludeSearch = attr(_data + 'exclude-search') === _true;
  const excludeHash = attr(_data + 'exclude-hash') === _true;
  const domain = attr(_data + 'domains') || '';
  const credentials = attr(_data + 'fetch-credentials') || 'omit';

  const domains = domain.split(',').map(n => n.trim());
  const host =
    hostUrl || '__COLLECT_API_HOST__' || currentScript.src.split('/').slice(0, -1).join('/');
  const endpoint = `${host.replace(/\/$/, '')}__COLLECT_API_ENDPOINT__`;
  const screen = `${width}x${height}`;
  const eventRegex = /data-umami-event-([\w-_]+)/;
  const eventNameAttribute = _data + 'umami-event';
  const delayDuration = 300;

  /* Helper functions */

  const normalize = raw => {
    if (!raw) return raw;
    try {
      const u = new URL(raw, location.href);
      if (excludeSearch) u.search = '';
      if (excludeHash) u.hash = '';
      return u.toString();
    } catch {
      return raw;
    }
  };

  // Persistent visitor id (localStorage). Survives the redirect to a hosted
  // checkout, so a payment webhook can attribute the sale back to this exact
  // visitor. Used as the distinct id unless the site explicitly identifies one.
  const getVisitorId = () => {
    if (!localStorage) return undefined;
    try {
      let id = localStorage.getItem('conclick.vid');
      if (!id) {
        id =
          (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
          'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('conclick.vid', id);
      }
      return id;
    } catch {
      return undefined;
    }
  };

  const getPayload = () => ({
    website,
    screen,
    language,
    title: document.title,
    hostname,
    url: currentUrl,
    referrer: currentRef,
    tag,
    id: identity || getVisitorId(),
  });

  const hasDoNotTrack = () => {
    const dnt = doNotTrack || ndnt || msdnt;
    return dnt === 1 || dnt === '1' || dnt === 'yes';
  };

  // Headless browsers and automation frameworks (Puppeteer, Selenium, Playwright,
  // PhantomJS, etc.) set navigator.webdriver or leak in the UA. They run JS and
  // otherwise look like a real Chrome, so the server-side isbot check can't catch
  // them — we stop them here, at the source, so they never become a pageview.
  const isAutomated = () => {
    try {
      return (
        navigator.webdriver === true ||
        / (Headless|PhantomJS|Electron|Playwright|Puppeteer)/i.test(navigator.userAgent || '') ||
        !!window._phantom ||
        !!window.callPhantom ||
        !!window.__nightmare ||
        '__selenium_unwrapped' in document ||
        '__webdriver_evaluate' in document
      );
    } catch {
      return false;
    }
  };

  /* Event handlers */

  const handlePush = (_state, _title, url) => {
    if (!url) return;

    currentRef = currentUrl;
    currentUrl = normalize(new URL(url, location.href).toString());

    if (currentUrl !== currentRef) {
      setTimeout(track, delayDuration);
    }
  };

  const handlePathChanges = () => {
    const hook = (_this, method, callback) => {
      const orig = _this[method];
      return (...args) => {
        callback.apply(null, args);
        return orig.apply(_this, args);
      };
    };

    history.pushState = hook(history, 'pushState', handlePush);
    history.replaceState = hook(history, 'replaceState', handlePush);
  };

  const handleClicks = () => {
    const trackElement = async el => {
      const eventName = el.getAttribute(eventNameAttribute);
      if (eventName) {
        const eventData = {};

        el.getAttributeNames().forEach(name => {
          const match = name.match(eventRegex);
          if (match) eventData[match[1]] = el.getAttribute(name);
        });

        return track(eventName, eventData);
      }
    };
    const onClick = async e => {
      const el = e.target;
      const parentElement = el.closest('a,button');
      if (!parentElement) return trackElement(el);

      const { href, target } = parentElement;
      if (!parentElement.getAttribute(eventNameAttribute)) return;

      if (parentElement.tagName === 'BUTTON') {
        return trackElement(parentElement);
      }
      if (parentElement.tagName === 'A' && href) {
        const external =
          target === '_blank' ||
          e.ctrlKey ||
          e.shiftKey ||
          e.metaKey ||
          (e.button && e.button === 1);
        if (!external) e.preventDefault();
        return trackElement(parentElement).then(() => {
          if (!external) {
            (target === '_top' ? top.location : location).href = href;
          }
        });
      }
    };
    document.addEventListener('click', onClick, true);
  };

  /* Autocapture — opt-in per website (toggled via the collect response). Records
     clicks on interactive elements + form submits as named events so events
     appear with no code. Skips anything already tagged with data-umami-event,
     and only reads element labels/selectors — never what a visitor types. */

  const _clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const _label = el =>
    _clean(
      el.getAttribute('aria-label') ||
        el.innerText ||
        el.textContent ||
        el.getAttribute('title') ||
        el.getAttribute('name') ||
        el.value ||
        '',
    ).slice(0, 40);
  const _selector = el => {
    const cls =
      el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
    return (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls).slice(0, 100);
  };
  // Human label for a page section: id > aria-label > nearest heading > data-section.
  const _sectionLabel = el => {
    const h = el.querySelector('h1,h2,h3');
    return _clean(
      (el.getAttribute('id') || '').replace(/[-_]+/g, ' ') ||
        el.getAttribute('aria-label') ||
        (h ? _label(h) : '') ||
        el.getAttribute('data-section') ||
        '',
    ).slice(0, 40);
  };

  const onAutoClick = e => {
    const el = e.target.closest(
      'a,button,[role="button"],input[type="submit"],input[type="button"]',
    );
    if (!el || el.closest('[' + eventNameAttribute + ']')) return;
    const label = _label(el);
    const data = { tag: el.tagName.toLowerCase(), selector: _selector(el) };
    if (label) data.text = label;
    if (el.tagName === 'A' && el.href) data.href = String(el.href).slice(0, 500);
    // Coarse vertical position of the click as a 0–100% bucket down the full page,
    // for the privacy-first click map. Never exact pixels — just how far down.
    data.y = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          ((window.scrollY + e.clientY) / (document.documentElement.scrollHeight || 1)) * 100,
        ),
      ),
    );
    track(('Clicked: ' + (label || el.tagName.toLowerCase())).slice(0, 50), data);
  };

  const onAutoSubmit = e => {
    const form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    formTouched = undefined; // submitted → not an abandon
    const label = _clean(form.getAttribute('name') || form.id || form.getAttribute('aria-label'));
    track(('Submitted: ' + (label || 'form')).slice(0, 50), {
      tag: 'form',
      selector: _selector(form),
    });
  };

  // Privacy-first frustration signals — element-level only, NEVER coordinates or
  // typed values: rage clicks (rapid repeats the page ignores), dead clicks
  // (looks clickable, page didn't respond), form abandons (started, never sent).
  //
  // v2: a signal only fires when the page DEMONSTRABLY did not respond. After a
  // candidate click we watch ~900ms for any response — DOM mutation, URL change,
  // scroll, or a text selection (selecting text is reading, not clicking). React/
  // Vue attach handlers synthetically, so "has an [onclick] attribute" proves
  // nothing either way; observed response is the only honest test. Working
  // buttons exonerate themselves; broken ones get flagged. False negatives are
  // acceptable, false alarms are not.
  const _safeText = el => (/^(input|textarea|select)$/i.test(el.tagName) ? '' : _label(el));

  const INTERACTIVE_SEL =
    'a[href],button,input,select,textarea,[role="button"],[onclick],[tabindex],label,summary';

  // Prefer the interactive / pointer-cursor ancestor over raw leaf nodes: an
  // svg <path> inside a button should report the button and its label.
  const _frustTarget = el => {
    try {
      const anc = el.closest(INTERACTIVE_SEL);
      if (anc) return anc;
    } catch {
      /* ignore */
    }
    let n = el;
    for (let i = 0; n && n.nodeType === 1 && i < 4; i++) {
      try {
        if (getComputedStyle(n).cursor === 'pointer') return n;
      } catch {
        break;
      }
      n = n.parentElement;
    }
    return null; // nothing about this click looked clickable
  };

  const _cancelFrust = () => {
    if (!frustPending) return;
    try {
      if (frustPending.observer) frustPending.observer.disconnect();
    } catch {
      /* ignore */
    }
    clearTimeout(frustPending.timer);
    frustPending = null;
  };

  const onFrustration = e => {
    try {
      const raw = e.target;
      if (!raw || raw.nodeType !== 1) return;
      // Modified/secondary clicks are intentional browser gestures, never friction.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const now = Date.now();
      const x = e.clientX;
      const y = e.clientY;

      // Rolling log for rage detection: SPATIAL (same spot), not selector
      // string — and only ever on clickable things, so triple-click text
      // selection can never register.
      frustClicks.push({ t: now, x, y });
      frustClicks = frustClicks.filter(c => now - c.t < 1200);

      const target = _frustTarget(raw);
      _cancelFrust(); // a new click supersedes the previous candidate
      if (!target) return; // plain text / non-clickable → never a signal

      const sel = _selector(target);
      const burst = frustClicks.filter(c => Math.abs(c.x - x) < 24 && Math.abs(c.y - y) < 24);
      const isRage = burst.length >= 4 && !frustSentRage[sel];
      if (!isRage && frustSentDead[sel]) return; // one dead report per element per view

      const pending = {
        sel,
        text: _safeText(target),
        rage: isRage,
        href: location.href,
        scrollY: window.scrollY,
        responded: false,
        observer: null,
        timer: 0,
      };
      frustPending = pending;
      try {
        pending.observer = new MutationObserver(() => {
          pending.responded = true;
          if (frustPending === pending) _cancelFrust();
        });
        pending.observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      } catch {
        /* no observer → rely on nav/scroll/selection checks */
      }
      pending.timer = setTimeout(() => {
        if (frustPending !== pending) return;
        frustPending = null;
        try {
          if (pending.observer) pending.observer.disconnect();
        } catch {
          /* ignore */
        }
        let selected = '';
        try {
          const s = window.getSelection && window.getSelection();
          selected = s ? String(s.toString()) : '';
        } catch {
          /* ignore */
        }
        const navigated = location.href !== pending.href;
        const scrolled = Math.abs(window.scrollY - pending.scrollY) > 8;
        if (pending.responded || navigated || scrolled || selected) return; // page responded
        if (pending.rage) {
          frustSentRage[pending.sel] = 1;
          track('frustration', { type: 'rage', selector: pending.sel, text: pending.text });
        } else {
          frustSentDead[pending.sel] = 1;
          track('frustration', { type: 'dead', selector: pending.sel, text: pending.text });
        }
      }, 900);
    } catch {
      /* tracker must never break the host page */
    }
  };

  const onFormInput = e => {
    const form = e.target && e.target.closest && e.target.closest('form');
    if (form && !formTouched) formTouched = _selector(form);
  };

  const startAutocapture = () => {
    if (autocaptureStarted) return;
    autocaptureStarted = true;
    document.addEventListener('click', onAutoClick, true);
    document.addEventListener('submit', onAutoSubmit, true);
    document.addEventListener('click', onFrustration, true);
    document.addEventListener('input', onFormInput, true);

    // Engagement: max scroll depth + total click count, sent once on page exit.
    const onScroll = () => {
      const e = document.documentElement;
      const denom = e.scrollHeight - e.clientHeight || 1;
      const pct = Math.min(100, Math.round(((window.scrollY || e.scrollTop || 0) / denom) * 100));
      if (pct > maxScroll) maxScroll = pct;
    };
    const sendEngagement = () => {
      if (engagementSent) return;
      engagementSent = true;
      if (formTouched) {
        track('frustration', { type: 'form_abandon', selector: formTouched });
      }
      if (maxScroll > 0 || clickCount > 0) {
        track('engagement', { scroll: maxScroll, clicks: clickCount });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener(
      'click',
      () => {
        clickCount++;
      },
      true,
    );
    window.addEventListener('pagehide', sendEngagement);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendEngagement();
    });

    // Section views: fire "Viewed: <section>" the FIRST time each section scrolls into
    // view. Powers single-page scroll-section funnels. Element-level only — never
    // coordinates or typed text. Deduped, capped at 8, disconnected on exit.
    try {
      const targets = new Set();
      document.querySelectorAll('section[id],article[id],div[id]').forEach(el => targets.add(el));
      document.querySelectorAll('section h2,section h3').forEach(h => {
        const s = h.closest('section');
        if (s) targets.add(s);
      });
      sectionObserver = new IntersectionObserver(
        entries => {
          for (const en of entries) {
            if (!en.isIntersecting) continue;
            const el = en.target;
            const sel = _selector(el);
            sectionObserver.unobserve(el);
            if (seenSections.has(sel)) continue;
            const label = _sectionLabel(el);
            if (
              !label ||
              /^(root|app|__next|main|container|wrapper|page|body|header|footer|nav|menu|content|skip)$/i.test(
                label,
              )
            )
              continue;
            seenSections.add(sel);
            track(('Viewed: ' + label).slice(0, 50), { tag: 'section', selector: sel });
            if (seenSections.size >= 8) {
              sectionObserver.disconnect();
              break;
            }
          }
        },
        { threshold: 0.5 },
      );
      let observed = 0;
      targets.forEach(el => {
        if (observed++ < 40) sectionObserver.observe(el);
      });
    } catch {
      /* IntersectionObserver unavailable — skip section tracking */
    }
    window.addEventListener('pagehide', () => {
      if (sectionObserver) sectionObserver.disconnect();
    });
  };

  /* Tracking functions */

  const trackingDisabled = () =>
    disabled ||
    !website ||
    isAutomated() ||
    (localStorage && localStorage.getItem('umami.disabled')) ||
    (domain && !domains.includes(hostname)) ||
    (dnt && hasDoNotTrack());

  const send = async (payload, type = 'event') => {
    if (trackingDisabled()) return;

    const callback = window[beforeSend];

    if (typeof callback === 'function') {
      payload = await Promise.resolve(callback(type, payload));
    }

    if (!payload) return;

    try {
      const res = await fetch(endpoint, {
        keepalive: true,
        method: 'POST',
        body: JSON.stringify({ type, payload }),
        headers: {
          'Content-Type': 'application/json',
          ...(typeof cache !== 'undefined' && { 'x-umami-cache': cache }),
        },
        credentials,
      });

      const data = await res.json();
      if (data) {
        disabled = !!data.disabled;
        cache = data.cache;
        if (data.autocapture) startAutocapture();
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      /* no-op */
    }
  };

  const init = () => {
    if (!initialized) {
      initialized = true;
      track();
      handlePathChanges();
      handleClicks();
    }
  };

  const track = (name, data) => {
    if (typeof name === 'string') return send({ ...getPayload(), name, data });
    if (typeof name === 'object') return send({ ...name });
    if (typeof name === 'function') return send(name(getPayload()));
    return send(getPayload());
  };

  const identify = (id, data) => {
    if (typeof id === 'string') {
      identity = id;
    }

    cache = '';
    return send(
      {
        ...getPayload(),
        data: typeof id === 'object' ? id : data,
      },
      'identify',
    );
  };

  /* Start */

  const api = { track, identify };
  // `conclick` is the public API name; keep `umami` as a back-compat alias so
  // anything already wired to it keeps working.
  if (!window.conclick) {
    window.conclick = api;
  }
  if (!window.umami) {
    window.umami = api;
  }

  let currentUrl = normalize(href);
  let currentRef = normalize(referrer.startsWith(origin) ? '' : referrer);

  let initialized = false;
  let disabled = false;
  let cache;
  let identity;
  let autocaptureStarted;
  let maxScroll = 0;
  let clickCount = 0;
  let engagementSent;
  let frustClicks = []; // recent clicks {t,x,y} for spatial rage detection
  let frustPending = null; // click candidate awaiting the response window
  let frustSentDead = {}; // one dead report per element per pageview
  let frustSentRage = {}; // one rage report per element per pageview
  let formTouched;
  let sectionObserver;
  const seenSections = new Set();

  // Auto-tag clicks on Dodo Payments checkout links with this visitor's id, so
  // the payment webhook can attribute the sale back to them — no checkout code.
  const tagCheckoutLinks = e => {
    const t = e.target;
    const a = t && t.closest ? t.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!/dodopayments\.com/i.test(href)) return;
    if (/[?&]metadata_distinct_id=/.test(href)) return;
    const vid = getVisitorId();
    if (!vid) return;
    a.href =
      href +
      (href.indexOf('?') > -1 ? '&' : '?') +
      'metadata_distinct_id=' +
      encodeURIComponent(vid);
  };

  // ---- Click-map live bridge ------------------------------------------------
  // When the Conclick dashboard embeds this page in an iframe with
  // ?conclick_hm=1, the tracker switches to measurement mode: it records
  // NOTHING (the owner viewing their own heatmap must not pollute analytics)
  // and instead streams element positions + scroll offsets to the parent,
  // which overlays click heat on the LIVE page. Positions only — no content,
  // no inputs, nothing sensitive leaves the page.
  const hmMode = /[?&#]conclick_hm=1/.test(href) && window.self !== window.top;

  const hmPost = msg => {
    try {
      window.parent.postMessage(Object.assign({ __conclick: 1 }, msg), '*');
    } catch {
      /* ignore */
    }
  };

  const hmMeasure = items => {
    const out = {};
    const normT = s => (s || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const loose = s =>
      normT(s)
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '');
    const clickables = Array.prototype.slice.call(
      document.querySelectorAll(
        'a, button, [role="button"], input[type="submit"], input[type="button"]',
      ),
    );
    const boxOf = el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height };
    };
    for (const it of items || []) {
      try {
        let el = null;
        const els = Array.prototype.slice.call(document.querySelectorAll(it.selector));
        el = els[0] || null;
        if (els.length > 1 && it.text) {
          const want = normT(it.text);
          const hit = els.find(c => {
            const t = normT(c.innerText || c.textContent || '');
            return !!t && (t === want || t.startsWith(want) || want.startsWith(t));
          });
          if (hit) el = hit;
        }
        if ((!el || !boxOf(el)) && it.text) {
          const want = loose(it.text);
          if (want) {
            el = clickables.find(c => loose(c.innerText || c.textContent || '') === want) || el;
          }
        }
        const b = el && boxOf(el);
        if (b) out[it.selector] = b;
      } catch {
        /* invalid selector */
      }
    }
    for (const c of clickables) {
      try {
        const sel = _selector(c);
        if (!out[sel]) {
          const b = boxOf(c);
          if (b) out[sel] = b;
        }
      } catch {
        /* ignore */
      }
    }
    return out;
  };

  if (hmMode) {
    let hmTargets = [];
    const hmSend = () => {
      const de = document.documentElement;
      hmPost({
        type: 'boxes',
        boxes: hmMeasure(hmTargets),
        width: de.clientWidth,
        height: Math.max(de.scrollHeight, document.body ? document.body.scrollHeight : 0),
        scrollY: window.scrollY,
      });
    };
    window.addEventListener('message', e => {
      const d = e.data;
      if (d && d.__conclick && d.type === 'hello') {
        hmTargets = d.targets || [];
        hmSend();
      }
    });
    window.addEventListener(
      'scroll',
      () => {
        requestAnimationFrame(() => hmPost({ type: 'scroll', y: window.scrollY }));
      },
      { passive: true },
    );
    window.addEventListener('resize', hmSend);
    const hmReady = () => {
      hmPost({ type: 'ready' });
      // Re-measure after reveal animations / late content settle.
      setTimeout(hmSend, 500);
      setTimeout(hmSend, 2500);
    };
    // Announce IMMEDIATELY (this script runs deferred, DOM is parsed) so the
    // dashboard's handshake beats its screenshot-fallback timer even on
    // image-heavy pages where window.load takes many seconds — then announce
    // again on load when geometry is final.
    hmReady();
    if (document.readyState !== 'complete') window.addEventListener('load', hmReady);
  }

  if (!hmMode && !trackingDisabled()) {
    document.addEventListener('click', tagCheckoutLinks, true);
  }

  if (!hmMode && autoTrack && !trackingDisabled()) {
    if (document.readyState === 'complete') {
      init();
    } else {
      document.addEventListener('readystatechange', init, true);
    }
  }
})(window);
