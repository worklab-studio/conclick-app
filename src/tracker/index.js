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
  // typed values: rage clicks (rapid repeats on one element), dead clicks (looks
  // clickable but isn't), and form abandons (started a form, never submitted).
  const _safeText = el => (/^(input|textarea|select)$/i.test(el.tagName) ? '' : _label(el));

  const onFrustration = e => {
    const t = e.target;
    if (!t || t.nodeType !== 1) return;
    const sel = _selector(t);
    const now = Date.now();

    if (sel === lastFrustSel && now - lastFrustAt < 700) {
      rageCount++;
      if (rageCount === 3) {
        track('frustration', { type: 'rage', selector: sel, text: _safeText(t) });
      }
    } else {
      rageCount = 1;
    }
    lastFrustSel = sel;
    lastFrustAt = now;

    const interactive = t.closest(
      'a[href],button,input,select,textarea,[role="button"],[onclick],[tabindex],label,summary',
    );
    if (!interactive) {
      let pointer = false;
      try {
        pointer = getComputedStyle(t).cursor === 'pointer';
      } catch {
        pointer = false;
      }
      if (pointer) {
        track('frustration', { type: 'dead', selector: sel, text: _safeText(t) });
      }
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
  };

  /* Tracking functions */

  const trackingDisabled = () =>
    disabled ||
    !website ||
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
  let rageCount = 0;
  let lastFrustSel;
  let lastFrustAt = 0;
  let formTouched;

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

  if (!trackingDisabled()) {
    document.addEventListener('click', tagCheckoutLinks, true);
  }

  if (autoTrack && !trackingDisabled()) {
    if (document.readyState === 'complete') {
      init();
    } else {
      document.addEventListener('readystatechange', init, true);
    }
  }
})(window);
