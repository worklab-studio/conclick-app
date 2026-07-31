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

// Carto dark-matter vector basemap, recolored into the dark matte planet
// look: near-black oceans, navy land, faint borders, soft labels. Vector is
// the only way to control each of those independently (raster can't). If an
// ad-blocker kills the style fetch, the 8s watchdog shows the retry overlay.
const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const PALETTE = {
  ocean: '#0a0d16',
  land: '#1a2130',
  border: 'rgba(132,152,196,0.32)',
  road: '#242c3e',
  label: '#9aa3ba',
  labelHalo: '#070a12',
};

/** Repaint every basemap layer into PALETTE; background goes transparent so
 *  the page starfield shows through around the sphere. */
function recolorBasemap(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers || []) {
    try {
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', 'rgba(0,0,0,0)');
        map.setPaintProperty(layer.id, 'background-opacity', 0);
      } else if (layer.type === 'fill') {
        const id = layer.id.toLowerCase();
        map.setPaintProperty(
          layer.id,
          'fill-color',
          id.includes('water') ? PALETTE.ocean : PALETTE.land,
        );
        map.setPaintProperty(layer.id, 'fill-outline-color', 'rgba(0,0,0,0)');
      } else if (layer.type === 'line') {
        const id = layer.id.toLowerCase();
        map.setPaintProperty(
          layer.id,
          'line-color',
          id.includes('boundary') || id.includes('admin') ? PALETTE.border : PALETTE.road,
        );
      } else if (layer.type === 'symbol') {
        map.setPaintProperty(layer.id, 'text-color', PALETTE.label);
        map.setPaintProperty(layer.id, 'text-halo-color', PALETTE.labelHalo);
      }
    } catch {
      /* style variations across carto versions */
    }
  }
}

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
      // Deep-blue space glow centered on the sphere.
      const R = Math.min(w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, R * 0.3, w / 2, h / 2, R * 1.05);
      g.addColorStop(0, 'rgba(37,71,171,0.5)');
      g.addColorStop(0.45, 'rgba(26,48,120,0.3)');
      g.addColorStop(0.75, 'rgba(14,26,70,0.16)');
      g.addColorStop(1, 'rgba(4,4,10,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
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
        style: STYLE_URL,
        center: [20, 12],
        zoom: homeZoomRef.current,
        minZoom: 0.35,
        maxZoom: 17,
        attributionControl: false,
        fadeDuration: 150,
      });
      // Bottom-left so the Conclick badge owns the bottom-right corner.
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
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
      recolorBasemap(map);
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        /* flat fallback on very old GPUs */
      }
      try {
        // Soft atmosphere rim; front light kills the day/night terminator so
        // the disc reads as one uniform matte planet (the DataFast look).
        (map as any).setSky?.({
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.25, 6, 0.25, 8, 0],
        });
        (map as any).setLight?.({ anchor: 'viewport', position: [1.15, 0, 0], intensity: 0.35 });
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
        const box = d * 1.34;
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
      const el = document.createElement('div');
      el.style.cssText = 'position:relative;width:38px;height:38px;cursor:pointer;';
      const img = document.createElement('img');
      img.src = v.avatar as string;
      img.alt = '';
      img.style.cssText =
        'width:38px;height:38px;border-radius:50%;border:2px solid rgba(20,20,34,0.9);' +
        'box-shadow:0 3px 12px rgba(0,0,0,0.65);background:#1c1c28;display:block;';
      const statusDot = document.createElement('span');
      statusDot.style.cssText =
        'position:absolute;right:-1px;top:-1px;width:11px;height:11px;border-radius:50%;' +
        'background:#34d399;border:2px solid #0a0a14;';
      el.appendChild(img);
      el.appendChild(statusDot);
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
            'radial-gradient(circle closest-side, rgba(56,89,199,0) 70%, rgba(59,96,220,0.20) 77%, rgba(90,125,255,0.30) 82%, rgba(59,96,220,0.16) 89%, rgba(0,0,0,0) 100%)',
        }}
      />
      {/* ROOT CAUSE OF THE BLANK GLOBE, do not size this div with position
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
            The globe couldn&apos;t render, this is usually a graphics (WebGL) hiccup in the
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
