'use client';

import { useEffect, useRef, type ReactNode } from 'react';
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
}

// Free vector basemap with real geography and city/street labels at zoom.
const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

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

    // Fit the WHOLE sphere inside the container with breathing room — the
    // sphere's apparent diameter is ~512*2^zoom px, so solve for the zoom
    // that leaves ~12% margin against the smaller container edge.
    const fitZoom = () => {
      const side = Math.min(wrap.clientWidth, wrap.clientHeight) * 0.88;
      return Math.max(0.35, Math.min(1.6, Math.log2(side / 512)));
    };
    homeZoomRef.current = fitZoom();

    const map = new maplibregl.Map({
      container: wrap,
      style: STYLE_URL,
      center: [20, 12],
      zoom: homeZoomRef.current,
      minZoom: 0.35,
      maxZoom: 17,
      attributionControl: false,
      fadeDuration: 150,
    });
    mapRef.current = map;

    map.on('style.load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        /* flat fallback on very old GPUs */
      }
      try {
        // Space-black canvas behind the globe + soft atmosphere halo.
        (map as any).setSky?.({
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 1, 8, 0],
        });
      } catch {
        /* ignore */
      }
      // Recolor the basemap into the page's palette: space-black background,
      // deep-navy ocean, charcoal land — Carto's default grey water is what
      // made the page look washed out.
      for (const layer of map.getStyle().layers || []) {
        try {
          if (layer.type === 'background') {
            map.setPaintProperty(layer.id, 'background-color', '#04040a');
          } else if (layer.id.includes('water') && layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-color', '#0a1020');
          } else if (
            layer.type === 'fill' &&
            (layer.id.includes('land') || layer.id.includes('earth'))
          ) {
            // Clearly lighter than the ocean — the first recolor flattened
            // land and water into the same near-black and killed all detail.
            map.setPaintProperty(layer.id, 'fill-color', '#232a3d');
          }
        } catch {
          /* style variations */
        }
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
    });

    // Keep the anchored card glued to its dot — imperative style writes on
    // the map's own render tick, zero React re-renders while moving. Hidden
    // when the dot rotates to the far side of the globe (>82° from center).
    const syncAnchor = () => {
      const el = anchorElRef.current;
      const a = anchorRef.current;
      if (!el) return;
      if (!a) {
        el.style.display = 'none';
        return;
      }
      const c = map.getCenter();
      const rad = Math.PI / 180;
      const gc =
        Math.acos(
          Math.min(
            1,
            Math.sin(a.lat * rad) * Math.sin(c.lat * rad) +
              Math.cos(a.lat * rad) * Math.cos(c.lat * rad) * Math.cos((a.lng - c.lng) * rad),
          ),
        ) / rad;
      if (gc > 82 && map.getZoom() < 4) {
        el.style.display = 'none';
        return;
      }
      const pt = map.project([a.lng, a.lat]);
      el.style.display = 'block';
      el.style.transform = `translate(${Math.round(pt.x)}px, ${Math.round(pt.y)}px) translate(-50%, calc(-100% - 16px))`;
    };
    map.on('render', syncAnchor);

    // Slow orbital spin while zoomed out and untouched.
    let raf = 0;
    const spin = () => {
      const m = mapRef.current;
      if (m && spinRef.current && readyRef.current && m.getZoom() < 1.9 && !m.isMoving()) {
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
    });
    ro.observe(wrap);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visitor updates → setData (never re-create the map).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource('visitors') as maplibregl.GeoJSONSource | undefined;
    src?.setData(toGeoJSON(visitors));
  }, [visitors]);

  // Focus request → cinematic fly-to at city zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    spinRef.current = false;
    map.flyTo({ center: [focus.lng, focus.lat], zoom: 5.5, speed: 0.85, curve: 1.5 });
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // Drift back out to the full floating sphere, then resume the spin.
      mapRef.current?.easeTo({ zoom: homeZoomRef.current, duration: 2200 });
      spinRef.current = true;
    }, 8000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  // Re-sync immediately when the anchor target changes.
  useEffect(() => {
    mapRef.current?.triggerRepaint();
  }, [anchor?.lat, anchor?.lng]);

  return (
    <div className={`relative ${className || ''}`} style={{ background: '#04040a' }}>
      <div ref={wrapRef} className="absolute inset-0" aria-label="Live visitor globe" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          ref={anchorElRef}
          className="pointer-events-auto absolute left-0 top-0"
          style={{ display: 'none', willChange: 'transform' }}
        >
          {anchorContent}
        </div>
      </div>
    </div>
  );
}
