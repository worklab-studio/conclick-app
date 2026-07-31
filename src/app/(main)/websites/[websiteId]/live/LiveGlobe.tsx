'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface GlobeVisitor {
  id: string;
  lat: number;
  lng: number;
  active: boolean;
  /** 0..1 — scales the marker (e.g. engagement/recency). */
  weight?: number;
  /** Data-URI avatar; active visitors with one get an on-globe avatar pin. */
  avatar?: string;
}

// Fully INLINE style — no external style.json fetch (those live on adblock
// lists and their failure blanked the globe silently). Real satellite
// imagery (the Google-Earth look) with a dark place-label overlay.
const SATELLITE_STYLE: any = {
  version: 8,
  sources: {
    sat: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery © Esri',
    },
    labels: {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap contributors',
    },
  },
  layers: [
    // Transparent — the page starfield shows through around the sphere.
    {
      id: 'bg',
      type: 'background',
      paint: { 'background-color': 'rgba(0,0,0,0)', 'background-opacity': 0 },
    },
    { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-fade-duration': 150 } },
    { id: 'labels', type: 'raster', source: 'labels', paint: { 'raster-opacity': 0.85 } },
  ],
};

/**
 * Real-earth globe (MapLibre v5 globe projection): space view zoomed out,
 * Google-Earth-style dive to city/street labels on scroll. Everything data-
 * driven goes through setData/paint updates — React never re-renders during
 * animation, which is what keeps it smooth where the old page stuttered.
 *
 * - Idle: slow auto-spin (only while zoomed out; pauses on interaction).
 * - Scroll: zoom from orbit to street level (maxZoom 17).
 * - `focus`: flies the camera to a visitor at city zoom.
 */
export function LiveGlobe({
  visitors,
  focus,
  onPick,
  anchor,
  anchorContent,
  className,
}: {
  visitors: GlobeVisitor[];
  focus?: { lat: number; lng: number; key: string } | null;
  /** Click on a visitor dot — receives the dot's coordinates. */
  onPick?: (coords: { lat: number; lng: number }) => void;
  /** Pin `anchorContent` to this coordinate (the visitor card on its dot). */
  anchor?: { lat: number; lng: number } | null;
  anchorContent?: ReactNode;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const spinRef = useRef(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visitorsRef = useRef<GlobeVisitor[]>([]);
  visitorsRef.current = visitors;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const homeZoomRef = useRef(1.1);
  const anchorRef = useRef<{ lat: number; lng: number } | null>(null);
  anchorRef.current = anchor || null;
  const anchorElRef = useRef<HTMLDivElement | null>(null);
  const starsRef = useRef<HTMLCanvasElement | null>(null);
  const haloRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<
    Map<string, { marker: maplibregl.Marker; el: HTMLElement; lat: number; lng: number }>
  >(new Map());
  const [failed, setFailed] = useState(false);

  const toGeoJSON = (list: GlobeVisitor[]) =>
    ({
      type: 'FeatureCollection',
      features: list
        .filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lng))
        .slice(0, 300)
        .map(v => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
          properties: { active: v.active ? 1 : 0, weight: Math.min(1, v.weight ?? 0.4) },
        })),
    }) as FeatureCollection;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || mapRef.current) return;

    // Apparent sphere diameter ≈ 193·2^(0.79·zoom) px — calibrated by
    // pixel-measuring real renders at zooms 2.2–3.3 (the orbit window).
    const sphereDiameter = (z: number) => 193 * Math.pow(2, 0.79 * z);
    // Fit the WHOLE sphere at ~88% of the shorter container edge.
    const fitZoom = () => {
      const target = Math.min(wrap.clientWidth, wrap.clientHeight) * 0.88;
      return Math.max(0.35, Math.min(3.4, Math.log2(target / 193) / 0.79));
    };
    homeZoomRef.current = fitZoom();

    // Static starfield — painted once per size, zero per-frame cost.
    const paintStars = () => {
      const cv = starsRef.current;
      if (!cv) return;
      const w = cv.clientWidth,
        h = cv.clientHeight,
        dpr = window.devicePixelRatio || 1;
      if (!w || !h) return;
      cv.width = w * dpr;
      cv.height = h * dpr;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      let seed = 42;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 420; i++) {
        const x = rnd() * w,
          y = rnd() * h;
        const r = rnd() < 0.92 ? rnd() * 0.9 + 0.25 : rnd() * 1.6 + 0.9;
        const a = 0.18 + rnd() * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 7);
        const tint = rnd();
        ctx.fillStyle =
          tint < 0.75
            ? `rgba(255,255,255,${a})`
            : tint < 0.9
              ? `rgba(170,190,255,${a})`
              : `rgba(255,225,180,${a * 0.85})`;
        ctx.fill();
      }
    };
    paintStars();

    const errors: string[] = [];
    let contextLost = false;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: wrap,
        style: SATELLITE_STYLE,
        center: [20, 12],
        zoom: homeZoomRef.current,
        minZoom: 0.35,
        maxZoom: 17,
        attributionControl: { compact: true },
        fadeDuration: 150,
      });
    } catch (e) {
      // Most likely: WebGL context creation failed (GPU denylist/exhaustion).
      errors.push(`constructor: ${(e as Error)?.message || e}`);
      setFailed(true);
      navigator.sendBeacon?.(
        '/api/live-globe-debug',
        JSON.stringify({ phase: 'constructor-threw', errors, ua: navigator.userAgent }),
      );
      return;
    }
    mapRef.current = map;

    // If Chrome kills our WebGL context (GPU pressure), the canvas goes
    // permanently black with no exception — surface it instead.
    map.getCanvas().addEventListener('webglcontextlost', () => {
      contextLost = true;
      setFailed(true);
    });

    // Never blank silently again: if the style hasn't come up in 8s, say so.
    const watchdog = setTimeout(() => {
      if (!readyRef.current) setFailed(true);
    }, 8000);
    map.on('error', e => {
      const msg = (e as any)?.error?.message || String(e);
      if (errors.length < 10) errors.push(msg);
      // Individual tile errors are routine; only log.
      // eslint-disable-next-line no-console
      console.warn('[live-globe]', msg);
    });

    // Temporary render-health beacon → /api/live-globe-debug → fly logs.
    const snapshot = (phase: string) => {
      const canvas = map.getCanvas();
      return JSON.stringify({
        phase,
        wrap: `${wrap.clientWidth}x${wrap.clientHeight}`,
        canvas: `${canvas.width}x${canvas.height}`,
        canvasCss: `${canvas.clientWidth}x${canvas.clientHeight}`,
        dpr: window.devicePixelRatio,
        ready: readyRef.current,
        loaded: map.loaded(),
        styleLoaded: map.isStyleLoaded(),
        zoom: +map.getZoom().toFixed(2),
        contextLost,
        errors,
        ua: navigator.userAgent.slice(0, 160),
      });
    };
    const beacons = [
      setTimeout(() => navigator.sendBeacon?.('/api/live-globe-debug', snapshot('t+3s')), 3000),
      setTimeout(() => navigator.sendBeacon?.('/api/live-globe-debug', snapshot('t+12s')), 12000),
    ];

    map.on('style.load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        /* flat fallback on very old GPUs */
      }
      try {
        // Space-black canvas behind the globe + soft atmosphere halo.
        (map as any).setSky?.({
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.35, 6, 0.35, 8, 0],
        });
      } catch {
        /* ignore */
      }
      map.addSource('visitors', { type: 'geojson', data: toGeoJSON(visitorsRef.current) });

      // Soft glow under active visitors.
      map.addLayer({
        id: 'v-halo',
        type: 'circle',
        source: 'visitors',
        filter: ['==', ['get', 'active'], 1],
        paint: {
          'circle-radius': ['+', 11, ['*', 7, ['get', 'weight']]],
          'circle-color': '#8b88d8',
          'circle-blur': 1,
          'circle-opacity': 0.4,
        },
      });
      // Recent (last hour) — dim, small.
      map.addLayer({
        id: 'v-recent',
        type: 'circle',
        source: 'visitors',
        filter: ['==', ['get', 'active'], 0],
        paint: {
          'circle-radius': 3,
          'circle-color': '#8b88d8',
          'circle-opacity': 0.35,
        },
      });
      // Active — bright core with white ring.
      map.addLayer({
        id: 'v-active',
        type: 'circle',
        source: 'visitors',
        filter: ['==', ['get', 'active'], 1],
        paint: {
          'circle-radius': ['+', 4, ['*', 2.5, ['get', 'weight']]],
          'circle-color': '#a5a1ff',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.2,
        },
      });

      // Click a visitor dot → hand its coordinates up (opens the card).
      const pick = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        const g = f?.geometry;
        if (g && g.type === 'Point') {
          const [lng, lat] = (g as any).coordinates;
          onPickRef.current?.({ lat, lng });
        }
      };
      for (const id of ['v-active', 'v-recent']) {
        map.on('click', id, pick);
        map.on('mouseenter', id, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', id, () => {
          map.getCanvas().style.cursor = '';
        });
      }

      readyRef.current = true;
      setFailed(false);
      clearTimeout(watchdog);
    });

    // One imperative pass per map render tick: anchored card position, halo
    // geometry, and far-side hiding for avatar markers. Zero React re-renders.
    const rad = Math.PI / 180;
    const degFromCenter = (lat: number, lng: number) => {
      const c = map.getCenter();
      return (
        Math.acos(
          Math.min(
            1,
            Math.sin(lat * rad) * Math.sin(c.lat * rad) +
              Math.cos(lat * rad) * Math.cos(c.lat * rad) * Math.cos((lng - c.lng) * rad),
          ),
        ) / rad
      );
    };
    const syncOverlays = () => {
      const zoom = map.getZoom();
      // — anchored visitor card —
      const el = anchorElRef.current;
      const a = anchorRef.current;
      if (el) {
        if (!a || (degFromCenter(a.lat, a.lng) > 82 && zoom < 4)) {
          el.style.display = 'none';
        } else {
          const pt = map.project([a.lng, a.lat]);
          el.style.display = 'block';
          el.style.transform = `translate(${Math.round(pt.x)}px, ${Math.round(pt.y)}px) translate(-50%, calc(-100% - 30px))`;
        }
      }
      // — blue halo hugging the sphere limb, fades out as the user dives —
      const halo = haloRef.current;
      if (halo) {
        const d = sphereDiameter(zoom);
        const box = d * 1.22;
        const fade = Math.max(0, Math.min(1, (homeZoomRef.current + 1.6 - zoom) / 1.2));
        halo.style.width = `${box}px`;
        halo.style.height = `${box}px`;
        halo.style.left = `${(wrap.clientWidth - box) / 2}px`;
        halo.style.top = `${(wrap.clientHeight - box) / 2}px`;
        halo.style.opacity = String(0.95 * fade);
      }
      // — avatar pins hide when their dot rotates behind the globe —
      for (const it of markersRef.current.values()) {
        it.el.style.visibility =
          degFromCenter(it.lat, it.lng) > 78 && zoom < 4 ? 'hidden' : 'visible';
      }
    };
    map.on('render', syncOverlays);

    // Slow orbital spin while zoomed out and untouched.
    let raf = 0;
    const spin = () => {
      const m = mapRef.current;
      if (
        m &&
        spinRef.current &&
        readyRef.current &&
        m.getZoom() < homeZoomRef.current + 0.3 &&
        !m.isMoving()
      ) {
        const c = m.getCenter();
        m.jumpTo({ center: [c.lng + 0.012, c.lat] });
      }
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);

    const pauseSpin = () => {
      spinRef.current = false;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        spinRef.current = true;
      }, 8000);
    };
    map.on('mousedown', pauseSpin);
    map.on('touchstart', pauseSpin);
    map.on('wheel', pauseSpin);

    const ro = new ResizeObserver(() => {
      map.resize();
      homeZoomRef.current = fitZoom();
      paintStars();
    });
    ro.observe(wrap);

    return () => {
      clearTimeout(watchdog);
      beacons.forEach(clearTimeout);
      ro.disconnect();
      cancelAnimationFrame(raf);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      markersRef.current.forEach(it => it.marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visitor updates → setData + avatar-marker reconciliation (never re-create
  // the map). DataFast-style: active visitors show as avatar pins on the globe.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource('visitors') as maplibregl.GeoJSONSource | undefined;
    src?.setData(toGeoJSON(visitors));

    const want = visitors
      .filter(v => v.active && v.avatar && Number.isFinite(v.lat) && Number.isFinite(v.lng))
      .sort((x, y) => (y.weight ?? 0) - (x.weight ?? 0))
      .slice(0, 14);
    const wantIds = new Set(want.map(v => v.id));
    const have = markersRef.current;
    for (const [id, it] of have) {
      if (!wantIds.has(id)) {
        it.marker.remove();
        have.delete(id);
      }
    }
    for (const v of want) {
      const existing = have.get(v.id);
      if (existing) {
        if (existing.lat !== v.lat || existing.lng !== v.lng) {
          existing.marker.setLngLat([v.lng, v.lat]);
          existing.lat = v.lat;
          existing.lng = v.lng;
        }
        continue;
      }
      const el = document.createElement('img');
      el.src = v.avatar as string;
      el.alt = '';
      Object.assign(el.style, {
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.9)',
        boxShadow: '0 0 0 3px rgba(139,136,216,0.35), 0 2px 10px rgba(0,0,0,0.6)',
        cursor: 'pointer',
        background: '#1c1c28',
      });
      const coords = { lat: v.lat, lng: v.lng };
      el.addEventListener('click', e => {
        e.stopPropagation();
        onPickRef.current?.(coords);
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat([v.lng, v.lat]).addTo(map);
      have.set(v.id, { marker, el, lat: v.lat, lng: v.lng });
    }
    map.triggerRepaint();
  }, [visitors]);

  // Focus request → rotate the globe to bring the dot front-center, at orbit.
  // The camera NEVER dives on its own (the old flyTo-5.5 left users stranded
  // on a flat clipped map); street zoom belongs to the user's scroll wheel.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    spinRef.current = false;
    if (map.getZoom() <= homeZoomRef.current + 0.75) {
      map.easeTo({ center: [focus.lng, focus.lat], zoom: homeZoomRef.current, duration: 1600 });
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      spinRef.current = true;
    }, 6000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  // Re-sync immediately when the anchor target changes.
  useEffect(() => {
    mapRef.current?.triggerRepaint();
  }, [anchor?.lat, anchor?.lng]);

  return (
    <div className={`relative ${className || ''}`} style={{ background: '#04040a' }}>
      <canvas
        ref={starsRef}
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <div
        ref={haloRef}
        aria-hidden
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          borderRadius: '50%',
          background:
            'radial-gradient(circle closest-side, rgba(56,89,199,0) 78%, rgba(70,105,230,0.26) 85%, rgba(96,130,255,0.34) 89%, rgba(56,89,199,0.12) 95%, rgba(0,0,0,0) 100%)',
        }}
      />
      {/* ROOT CAUSE OF THE BLANK GLOBE — do not size this div with position
          utilities alone: maplibre-gl.css loads AFTER Tailwind here and its
          `.maplibregl-map{position:relative}` overrides Tailwind's `absolute`,
          which made `inset-0` stop sizing the div → 0×0 container → canvas
          clipped to nothing. Inline position wins over any stylesheet, and
          h-full/w-full are dimension-based so they survive regardless. */}
      <div
        ref={wrapRef}
        className="absolute inset-0 h-full w-full"
        style={{ position: 'absolute', inset: 0 }}
        aria-label="Live visitor globe"
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          ref={anchorElRef}
          className="pointer-events-auto absolute left-0 top-0"
          style={{ display: 'none', willChange: 'transform' }}
        >
          {anchorContent}
        </div>
      </div>
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 px-5 py-4 text-center text-sm text-zinc-400">
            The globe couldn&apos;t render — this is usually a graphics (WebGL) hiccup in the
            browser, an ad-blocker, or a network issue.
            <button
              type="button"
              onClick={() => location.reload()}
              className="ml-2 text-indigo-300 underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
